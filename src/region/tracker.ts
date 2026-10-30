import type { Region } from './overpass';

// Hysteresis so GPS jitter at a border doesn't flip the music back and forth:
// a new region must be seen on `confirmFixes` fixes in a row spanning `confirmMs`.
export type TrackerState = {
  current: Region | null;
  pending: { region: Region; firstSeen: number; count: number } | null;
};

export type TrackerConfig = { confirmFixes: number; confirmMs: number };

export function step(
  state: TrackerState,
  seen: Region | null,
  now: number,
  cfg: TrackerConfig,
): { state: TrackerState; switchedTo: Region | null } {
  // Outside any known region, or still in the current one: keep playing.
  if (!seen || seen.id === state.current?.id) {
    return { state: { ...state, pending: null }, switchedTo: null };
  }

  // The very first region plays right away; nothing to flap against yet.
  if (!state.current) {
    return { state: { current: seen, pending: null }, switchedTo: seen };
  }

  const pending =
    state.pending?.region.id === seen.id
      ? { ...state.pending, count: state.pending.count + 1 }
      : { region: seen, firstSeen: now, count: 1 };

  if (pending.count >= cfg.confirmFixes && now - pending.firstSeen >= cfg.confirmMs) {
    return { state: { current: seen, pending: null }, switchedTo: seen };
  }
  return { state: { ...state, pending }, switchedTo: null };
}
