import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TrackerState } from './region/tracker';
import type { Region } from './region/lookup';

// Shared between the UI and the background location task.
export type AppState = {
  tracker: TrackerState;
  lastQuery: { lat: number; lon: number; region: Region | null } | null;
};

const STATE_KEY = 'app-state';
const LOG_KEY = 'event-log';
const MAX_LOG = 300; // enough for a 1-hour field walk

export const emptyState = (): AppState => ({
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

// Areas entered, newest first, for the journey list on the screen.
export type Visit = { t: number; name: string; kind: Region['kind']; song: string };
const VISITS_KEY = 'visits';
const MAX_VISITS = 50;

export async function recordVisit(visit: Visit): Promise<void> {
  const visits = await readVisits();
  visits.unshift(visit);
  await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(visits.slice(0, MAX_VISITS)));
}

export async function readVisits(): Promise<Visit[]> {
  const raw = await AsyncStorage.getItem(VISITS_KEY);
  return raw ? JSON.parse(raw) : [];
}
