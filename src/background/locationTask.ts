import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { LOCATION_TASK, TRACKING } from '../config';
import { musicGeneration, nowPlaying, playRegion, stopMusic } from '../music/player';
import { distanceM, regionAt, type Region } from '../region/lookup';
import { step } from '../region/tracker';
import { loadState, log, saveState } from '../storage';

// Fixes can arrive while a slow lookup/Spotify call is still running; drop them.
// busySince is a timestamp so a stuck run can't block every later fix.
let busySince: number | null = null;
const BUSY_EXPIRE_MS = 60_000;

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
    if (fix) await processFix(fix);
  },
);

async function processFix(fix: Location.LocationObject, maxAccuracyM = TRACKING.maxAccuracyM) {
  if (busySince !== null) {
    if (Date.now() - busySince < BUSY_EXPIRE_MS) return;
    await log('Previous update took over 60 s; continuing anyway');
  }
  const started = Date.now();
  busySince = started;
  try {
    await handleFix(fix, maxAccuracyM);
  } catch (e) {
    await log(`Error: ${(e as Error).message}`);
  } finally {
    if (busySince === started) busySince = null;
  }
}

async function handleFix(fix: Location.LocationObject, maxAccuracyM: number) {
  // A lookup takes a few seconds; if Stop is pressed meanwhile, don't start music after it.
  const generation = musicGeneration();
  const { latitude: lat, longitude: lon, accuracy } = fix.coords;
  if (accuracy != null && accuracy > maxAccuracyM) {
    await log(`Skipped fix: accuracy ${Math.round(accuracy)} m (need <= ${maxAccuracyM} m)`);
    return;
  }

  const state = await loadState();

  let seen: Region | null;
  const last = state.lastQuery;
  if (last && distanceM(lat, lon, last.lat, last.lon) < TRACKING.requeryDistanceM) {
    seen = last.region;
  } else {
    seen = await regionAt(lat, lon);
    state.lastQuery = { lat, lon, region: seen };
    await log(
      `Fix ${lat.toFixed(5)},${lon.toFixed(5)} ±${Math.round(accuracy ?? 0)} m -> ` +
        (seen ? `${seen.name} (${seen.kind})` : 'no region'),
    );
  }

  const result = step(state.tracker, seen, fix.timestamp, TRACKING);
  state.tracker = result.state;
  await saveState(state);

  if (result.switchedTo) {
    await playRegion(result.switchedTo, generation);
  } else if (state.tracker.current && !nowPlaying()) {
    // Same area, but this JS runtime has no player: Android restarted the app
    // in the background (or it was reloaded). Pick the theme back up.
    await playRegion(state.tracker.current, generation, true);
  }
}

export async function startTracking(): Promise<string | null> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'Location permission denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return 'Background location ("Allow all the time") denied';

  // A force-stopped or reloaded app can leave a stale registration behind; start clean.
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: TRACKING.distanceIntervalM,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.Other,
    foregroundService: {
      notificationTitle: 'RegionMusic',
      notificationBody: 'Playing the theme for where you are',
      killServiceOnDestroy: false,
    },
  });
  // Forget the previous region so the current one plays right away.
  const state = await loadState();
  state.tracker = { current: null, pending: null };
  state.lastQuery = null;
  await saveState(state);
  await log('Tracking started');

  // Updates only arrive after moving distanceIntervalM, so handle where we are now.
  // High accuracy can wait forever for GPS indoors; Balanced uses Wi-Fi/cell.
  try {
    await log('Getting current position...');
    const here =
      (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    // Indoors this is often a ~100 m Wi-Fi fix; good enough to start some music,
    // and the next fix on the move replaces it.
    await processFix(here, TRACKING.maxStartAccuracyM);
  } catch (e) {
    await log(`Current position failed: ${(e as Error).message}`);
  }
  return null;
}

export async function stopTracking() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  stopMusic();
  await log('Tracking stopped');
}

// Called when the app opens while tracking is already on.
export async function resumeMusic(): Promise<void> {
  const state = await loadState();
  if (state.tracker.current && !nowPlaying()) await playRegion(state.tracker.current, undefined, true);
}

export async function isTracking(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
}
