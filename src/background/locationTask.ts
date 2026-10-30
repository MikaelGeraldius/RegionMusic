import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { LOCATION_TASK, TRACKING } from '../config';
import { hash } from '../hash';
import { distanceM, regionAt, type Region } from '../region/overpass';
import { step } from '../region/tracker';
import { pickDevice, playlistLength, playPlaylist } from '../spotify/api';
import { loadState, log, saveState } from '../storage';

// Fixes can arrive while a slow Overpass/Spotify call is still running; drop them.
let busy = false;

// Must run at module load (imported from index.ts): the OS can start the app
// in the background with no React components mounted.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      await log(`Location error: ${error.message}`);
      return;
    }
    const fix = data?.locations?.at(-1);
    if (!fix || busy) return;
    busy = true;
    try {
      await handleFix(fix);
    } catch (e) {
      await log(`Error: ${(e as Error).message}`);
    } finally {
      busy = false;
    }
  },
);

async function handleFix(fix: Location.LocationObject) {
  const { latitude: lat, longitude: lon, accuracy } = fix.coords;
  if (accuracy != null && accuracy > TRACKING.maxAccuracyM) return;

  const state = await loadState();

  let seen: Region | null;
  const last = state.lastQuery;
  if (last && distanceM(lat, lon, last.lat, last.lon) < TRACKING.requeryDistanceM) {
    seen = last.region;
  } else {
    seen = await regionAt(lat, lon);
    state.lastQuery = { lat, lon, region: seen };
  }

  const result = step(state.tracker, seen, fix.timestamp, TRACKING);
  state.tracker = result.state;
  await saveState(state);

  if (result.switchedTo) await playRegion(result.switchedTo, state.playlists);
}

async function playRegion(region: Region, playlists: string[]) {
  if (playlists.length === 0) {
    await log(`Entered ${region.name} (no playlists set)`);
    return;
  }
  const h = hash(region.id);
  const playlistId = playlists[h % playlists.length];

  const device = await pickDevice();
  if (!device) {
    await log(`Entered ${region.name}, but no Spotify device: open Spotify and play something once`);
    return;
  }
  // Same place, same starting song.
  const length = await playlistLength(playlistId);
  const start = length ? h % length : 0;
  await playPlaylist(playlistId, device.id, start);
  await log(`Entered ${region.name} -> playlist ${playlistId} #${start + 1} on ${device.name}`);
}

export async function startTracking(): Promise<string | null> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'Location permission denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return 'Background location ("Allow all the time") denied';

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: TRACKING.distanceIntervalM,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.Other,
    foregroundService: {
      notificationTitle: 'RegionMusic',
      notificationBody: 'Playing music for where you are',
      killServiceOnDestroy: false,
    },
  });
  await log('Tracking started');
  return null;
}

export async function stopTracking() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  await log('Tracking stopped');
}

export async function isTracking(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
}
