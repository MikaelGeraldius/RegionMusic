export const LOCATION_TASK = 'region-music-location';

// Region tracking tuning (spike values; field-tune in Phase 6).
export const TRACKING = {
  distanceIntervalM: 25, // OS delivers a fix after moving this far
  requeryDistanceM: 75, // only look up the place again after moving this far
  maxAccuracyM: 50, // ignore fixes worse than this
  maxStartAccuracyM: 200, // ...except the first fix after starting, so music starts indoors
  confirmFixes: 2, // a new region must be seen on this many fixes in a row...
  confirmMs: 10_000, // ...spanning at least this long, before music switches
};
