// Spotify app registered at https://developer.spotify.com/dashboard.
// Put the Client ID in .env.local as EXPO_PUBLIC_SPOTIFY_CLIENT_ID (see .env.example).
export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';

// Must be added verbatim as a Redirect URI in the Spotify dashboard.
export const APP_SCHEME = 'regionmusic';
export const REDIRECT_PATH = 'callback';

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
];

export const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export const LOCATION_TASK = 'region-music-location';

// Region tracking tuning (spike values; field-tune in Phase 6).
export const TRACKING = {
  distanceIntervalM: 25, // OS delivers a fix after moving this far
  requeryDistanceM: 75, // only ask Overpass again after moving this far
  maxAccuracyM: 50, // ignore fixes worse than this
  confirmFixes: 2, // a new region must be seen on this many fixes in a row...
  confirmMs: 10_000, // ...spanning at least this long, before music switches
};
