import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TrackerState } from './region/tracker';
import type { Region } from './region/overpass';

// Shared between the UI and the background location task.
export type AppState = {
  playlists: string[]; // Spotify playlist ids
  tracker: TrackerState;
  lastQuery: { lat: number; lon: number; region: Region | null } | null;
};

const STATE_KEY = 'app-state';
const LOG_KEY = 'event-log';
const MAX_LOG = 60;

export const emptyState = (): AppState => ({
  playlists: [],
  tracker: { current: null, pending: null },
  lastQuery: null,
});

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export type LogEntry = { t: number; msg: string };

export async function log(msg: string): Promise<void> {
  const entries = await readLog();
  entries.unshift({ t: Date.now(), msg });
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, MAX_LOG)));
}

export async function readLog(): Promise<LogEntry[]> {
  const raw = await AsyncStorage.getItem(LOG_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearLog(): Promise<void> {
  await AsyncStorage.removeItem(LOG_KEY);
}
