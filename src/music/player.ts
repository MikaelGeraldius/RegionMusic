import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { hash } from '../hash';
import { HOME_THEMES } from '../region/home';
import type { Region } from '../region/lookup';
import { log, recordVisit } from '../storage';
import { TRACKS, type Track } from './tracks.generated';

const FADE_MS = 2500;
const FADE_STEP_MS = 100;

const KIND_LABEL = { city: 'City', town: 'Town', route: 'Route' } as const;

// One looping theme at a time, like the games. Kept on globalThis so a JS
// reload can't orphan a playing player that Stop then can't reach, and shared
// by the background location task and the UI in the same JS runtime.
type MusicState = {
  current: { player: AudioPlayer; track: Track } | null;
  players: Set<AudioPlayer>; // every player not yet removed, crossfades included
  generation: number; // bumped by stopMusic; switches from an older generation are dropped
  modeSet: boolean;
};
const g = globalThis as typeof globalThis & { __regionMusic?: MusicState };
const music: MusicState = (g.__regionMusic ??= {
  current: null,
  players: new Set(),
  generation: 0,
  modeSet: false,
});

export function musicGeneration(): number {
  return music.generation;
}

export function trackFor(region: Region): Track | null {
  // The home area plays its starter themes, if those files are there.
  const homeTitles = region.home ? HOME_THEMES[region.kind] : undefined;
  const homePool = homeTitles ? TRACKS[region.kind].filter((t) => homeTitles.includes(t.title)) : [];
  const pool = homePool.length ? homePool : TRACKS[region.kind];
  return pool.length ? pool[hash(region.id) % pool.length] : null;
}

export async function playRegion(region: Region, generation = music.generation): Promise<void> {
  // Stop was pressed while this area was being looked up.
  if (generation !== music.generation) return;
  const track = trackFor(region);
  if (!track) {
    await log(`Entered ${region.name} (${KIND_LABEL[region.kind]}), but assets/music/${region.kind}/ is empty`);
    return;
  }
  // Two places can share a theme; keep it playing instead of restarting it.
  const current = music.current;
  if (current?.track.file === track.file) {
    current.player.updateLockScreenMetadata({ title: track.title, artist: region.name });
    await recordVisit({ t: Date.now(), name: region.name, kind: region.kind, song: track.title });
    await log(`Entered ${region.name} (${KIND_LABEL[region.kind]}), same theme: ${track.title}`);
    return;
  }

  if (!music.modeSet) {
    // doNotMix is required for lock screen controls, which Android needs to
    // keep playing in the background past ~3 minutes.
    await setAudioModeAsync({ shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
    music.modeSet = true;
    if (generation !== music.generation) return;
  }

  const next = createAudioPlayer(track.source);
  music.players.add(next);
  next.loop = true;
  next.volume = 0;
  next.play();
  next.setActiveForLockScreen(true, { title: track.title, artist: region.name });

  const previous = current;
  music.current = { player: next, track };
  await crossfade(previous?.player ?? null, next, generation);
  if (generation !== music.generation) return; // stopped mid-fade; stopMusic removed both
  if (previous) release(previous.player);
  await recordVisit({ t: Date.now(), name: region.name, kind: region.kind, song: track.title });
  await log(`Entered ${region.name} (${KIND_LABEL[region.kind]}) -> ${track.title}`);
}

export function stopMusic(): void {
  music.generation++;
  for (const player of [...music.players]) release(player);
  music.current = null;
}

export function nowPlaying(): string | null {
  return music.current?.track.title ?? null;
}

function release(player: AudioPlayer) {
  music.players.delete(player);
  try {
    player.pause();
    player.remove();
  } catch {
    // Already released.
  }
}

// Equal-power curves, so the loudness doesn't dip halfway through.
function crossfade(from: AudioPlayer | null, to: AudioPlayer, generation: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (generation !== music.generation) {
        clearInterval(timer);
        resolve();
        return;
      }
      const t = Math.min(1, (Date.now() - start) / FADE_MS);
      to.volume = Math.sin((t * Math.PI) / 2);
      if (from) from.volume = Math.cos((t * Math.PI) / 2);
      if (t >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, FADE_STEP_MS);
  });
}
