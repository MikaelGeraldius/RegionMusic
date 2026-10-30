# Findings & Decisions

## Requirements
- Mobile app that auto-plays music tied to the user's current "region" (city district, neighborhood, park, or street).
- Inspiration: old Pokemon games, where every route/town has its own theme.
- Music crossfades smoothly when the user moves from one region to another.
- Implied: works with the phone locked/in a pocket (background location + background audio).
- Implied: the same place always plays the same theme (deterministic, "this is Main St's song").

## Research Findings (from domain knowledge, not yet verified on device)

### Region detection
- Two approaches:
  1. **OS geofencing** - cheap on battery, but iOS caps at 20 monitored regions/app and Android ~100; circles only, and entry events can lag 1-3 min. Too coarse for streets.
  2. **Continuous location + local point-in-polygon** - get GPS fixes (every ~20-50 m via distance filter), test against region polygons stored on device with a spatial index (rbush + turf `booleanPointInPolygon`). Works for any shape, any count. Costs more battery.
- Recommended: approach 2, with a geofence/significant-change fallback to wake the app when it has been suspended.
- **Region data source: OpenStreetMap.** Neighborhoods/districts = `boundary=administrative` (admin_level 9-10) and `place=neighbourhood|suburb`; parks = `leisure=park`; water = `natural=water`; streets = `highway=*` ways. Pull via Overpass API or pre-built extracts, simplify, and ship per-city packs.
- Streets are lines, not areas: match the user to the nearest street segment within ~15-25 m (map matching), not point-in-polygon.
- **Border flapping**: GPS jitter (5-20 m) near a boundary will bounce between regions. Need hysteresis: require N consecutive fixes or X seconds (e.g. 8-15 s) inside a new region before switching, and ignore fixes with poor accuracy.
- Region priority when nested (street inside park inside district): pick most specific with a sensible rule, e.g. park > street > neighborhood > city.

### Audio
- Crossfade = two players: fade out A while fading in B over 3-8 s using an equal-power curve (not linear, which dips in the middle).
- Tracks should be seamless loops (like game BGM). Loop points matter; gapless looping needs a native-capable player.
- Background playback: iOS `UIBackgroundModes` = `audio` + `location`; Android needs a foreground service (types `location|mediaPlayback` on Android 14+) with a persistent notification.
- Should duck/pause for calls, navigation prompts, and other apps' audio (audio focus / AVAudioSession interruptions).

### Music source (biggest product + legal question)
- Pokemon/Nintendo music cannot be shipped: copyright. Need a legal source.
- Options:
  1. Original or commissioned chiptune/lo-fi loops, bundled (best fit, full control of looping/crossfade).
  2. Royalty-free / CC0 / CC-BY loop libraries (cheap MVP).
  3. Procedural/generative music seeded by region ID (infinite unique themes; harder to make sound good).
  4. User-assigned local audio files per region.
  5. Spotify/Apple Music - their SDKs restrict control (no custom crossfade/looping, needs Premium, ToS limits), so a poor fit for the core experience.
- Assignment idea: categorize regions by type (downtown, residential, park, water, campus, highway) -> pick a track pool -> hash(region id) chooses the track, so it's stable per place. Users can override and "claim" a theme for a spot.

### Tech stack options
- **React Native + Expo (dev build)**: `expo-location` + `expo-task-manager` for background location; `react-native-track-player` or `expo-audio` for background audio. Cross-platform, fast to build. Crossfade needs two player instances or a native module.
- **Flutter**: `geolocator`/`background_locator`, `just_audio` (good gapless + multiple players). Also solid.
- **Native (Swift + Kotlin)**: best background reliability and audio control (AVAudioEngine / ExoPlayer), but two codebases.
- Recommendation: Expo dev build + react-native-track-player for MVP, dropping to small native modules only if crossfade/background proves unreliable. Prove that in a spike before anything else.

### Battery / permissions
- Needs "Always" location on iOS ("Allow all the time" on Android) for locked-screen use; App Store review requires a clear justification.
- Battery levers: distance filter 20-50 m, balanced accuracy when walking, pause updates when stationary, lower rate in vehicles.

## Phase 2 Findings (Expo SDK 58 docs + Spotify PKCE docs, 2026-10-30)
- Project: Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6. Project AGENTS.md says to check versioned docs before using Expo APIs.
- **expo-location** config plugin: `isIosBackgroundLocationEnabled`, `isAndroidBackgroundLocationEnabled`, `isAndroidForegroundServiceEnabled`, `locationAlwaysAndWhenInUsePermission`, `locationWhenInUsePermission`. `startLocationUpdatesAsync(task, {accuracy, distanceInterval, timeInterval, activityType, pausesUpdatesAutomatically, showsBackgroundLocationIndicator, foregroundService:{notificationTitle, notificationBody, notificationColor, killServiceOnDestroy}})`. Request foreground permission before background. Android 11+ sends the user to Settings for "Allow all the time". Background location doesn't work in Expo Go -> needs a development build.
- **expo-task-manager**: `defineTask(name, ({data, error, executionInfo}) => ...)` must run at module scope (imported from index.ts) because the app can launch in the background with no components mounted.
- **expo-auth-session**: `useAuthRequest({clientId, redirectUri, scopes, usePKCE: true}, discovery)`; PKCE verifier is `request.codeVerifier`, pass it to `exchangeCodeAsync` via `extraParams.code_verifier`. Needs `expo-crypto`. `scheme` in app.json for the redirect.
- **Spotify PKCE**: authorize `https://accounts.spotify.com/authorize`, token `https://accounts.spotify.com/api/token` (form-encoded, `client_id` + `code_verifier`, no secret). Redirect URI must match the dashboard exactly. Refresh may not return a new refresh token -> keep the old one.
- **expo-secure-store**: background task must read tokens while the phone is locked -> store with `keychainAccessible: AFTER_FIRST_UNLOCK` (default WHEN_UNLOCKED would fail on a locked iPhone). Keys allow only `[A-Za-z0-9._-]`.
- Spotify playback needs an *active device*: `PUT /me/player/play` returns 404 NO_ACTIVE_DEVICE if Spotify hasn't played recently on the phone. Pick the phone's device id from `GET /me/player/devices`.
- No Expo API sets Android media volume, so the Android fade needs a third-party/native module -> deferred to Phase 4. Spike switches instantly.
- Spike region source: Overpass `is_in(lat,lon)` returning the kelurahan (admin_level 7, fallback 6) containing the fix, queried only after moving >= 75 m. Overpass public servers are rate-limited; OK for a spike, replace with cached polygons in Phase 3.

## On-device findings (2026-10-30, POCO 22111317PG)
- overpass-api.de and other Overpass mirrors: TCP connect timeouts from the user's network; Overpass also returns 406 for Android's default okhttp User-Agent. Using Nominatim reverse (zoom 13) instead.
- Nominatim zoom 13 isn't always kelurahan: at -6.12690,106.70445 it returned "Kalideres" with addresstype `municipality` (a kecamatan-level area), at Monas the kelurahan `neighbourhood` Gambir, near UI the `village` Pondok Cina. Phase 3 needs real polygons with explicit admin_level 7 to get consistent kelurahan.
- Android high-accuracy GPS can stay unanswered indoors; use last known / Balanced for the first fix.
- Spotify playback needs the Spotify app open as an active device ("no Spotify device" otherwise).

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Local point-in-polygon over OS geofences | Geofence count limits and circle-only shapes can't express streets/neighborhoods |
| OpenStreetMap as region source | Free, global, has neighborhood/park/street geometry |
| Hysteresis before switching regions | Prevents music flapping from GPS jitter at borders |
| Equal-power crossfade, 3-8 s | Smooth "game-like" transition with no volume dip |
| No Pokemon music | Copyright; use original/royalty-free/generative tracks |
| Spotify as music source (user choice) | User wants their own Spotify; personal/dev-mode scale only |
| Control Spotify via Web API, not App Remote | Works from the background location task over HTTPS |
| Transition default = switch at song end | Only way to get a smooth feel on iOS; Android adds a volume fade |
| Fetch OSM regions online around the user, cache them | User wants online for now; no city packs yet |
| Launch area: Jabodetabek; default region = kelurahan (admin_level 7), fallback kecamatan (6) | Kelurahan is neighborhood-sized; kecamatan fills gaps |

## User Answers (2026-10-30)
- Platforms: **both iOS + Android**.
- Music source: **Spotify** - play music from the user's Spotify.
- Granularity: **both** - neighborhoods/parks by default, street-level as a toggle.
- Area: **user's own city, online for now** (city name not given yet).

## Spotify Research (web search 2026-10-30; verify on developer.spotify.com before relying on it)
- **Access limits:** Since 15 May 2025, Web API *extended* access only goes to registered businesses with a launched service and ~250k MAU. Everyone else stays in *development mode*: only allowlisted users (sources say 25, possibly cut to 5) can log in; others get 403.
  -> Fine for a personal app / small friends group. A public store release with Spotify is effectively blocked unless Spotify grants extended access.
- **Premium required** for playback control (start/pause/queue/volume) via Web API and App Remote SDK.
- **No mixing:** Spotify audio plays inside the Spotify app; our app only sends commands. We cannot run two streams and crossfade them ourselves.
- **Volume:** Web API `set volume` is often rejected for the phone's own device, especially on iOS; iOS also doesn't let third-party apps set system volume. Android apps *can* ramp the media volume themselves (AudioManager).
- **Background:** Web API calls are plain HTTPS, so they can be sent from our background location task. App Remote SDK connections are flaky when backgrounded/paused (anecdotal), so prefer the Web API for control.
- Spotify's own "Crossfade" setting only smooths automatic song-to-song transitions, not commands from another app.

### What "smooth transition" can mean with Spotify
| Mode | iOS | Android |
|------|-----|---------|
| Switch at end of current song (queue region's next track) | yes, smoothest feel | yes |
| Fade out -> switch -> fade in | no (can't control volume reliably) | yes, via media volume ramp |
| Instant switch | yes | yes |
Recommended default: "switch at song end", with a max wait (e.g. 90 s) after which it switches immediately (Android fades).

### Region -> music mapping with Spotify
- Each region type (downtown, park, water, residential, campus, street) -> a Spotify playlist the user picks (or app-suggested via search).
- Specific regions can be pinned to their own playlist/track.
- Deterministic start: hash(region id) picks the starting track in the playlist, so a place "has its song".

## Target Area: Jabodetabek, Indonesia (user answer 2026-10-30)
- Jakarta + Bogor, Depok, Tangerang, Bekasi (cities and regencies). Huge metro (~30M people), so fetch regions around the user, never the whole area.
- **OSM admin levels in Indonesia** (from general OSM knowledge; verify with Overpass in Phase 3):
  - 4 = provinsi (DKI Jakarta, Jawa Barat, Banten)
  - 5 = kota / kabupaten (e.g. Jakarta Selatan, Kota Depok)
  - 6 = kecamatan (district) -> good "town" size, like a Pokemon city
  - 7 = kelurahan / desa (sub-district) -> good "neighborhood" size
  - RW/RT units are small and patchily mapped; skip.
  - Default region = kelurahan, with kecamatan as fallback where kelurahan is missing.
- Other region types worth mapping: parks/green spaces (e.g. Monas, GBK, Kebun Raya Bogor), malls (`shop=mall`, very common), campuses (UI Depok), toll roads (`highway=motorway` -> "route" music when driving), rivers/coast, stations.
- **GPS conditions:** tall buildings around Sudirman/Thamrin/Kuningan cause multipath errors -> hysteresis and accuracy filtering matter more downtown.
- **Travel modes:** lots of motorbike and car travel in heavy traffic, plus KRL/MRT trains. Underground MRT stretches lose GPS; keep the current music until a good fix returns.
- Spotify is available in Indonesia (Premium needed for control).

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
- OpenStreetMap Overpass API: https://overpass-api.de/
- Turf.js (point-in-polygon, geometry): https://turfjs.org/
- rbush spatial index: https://github.com/mourner/rbush
- Expo Location background docs: https://docs.expo.dev/versions/latest/sdk/location/
- react-native-track-player: https://rntp.dev/
- Spotify extended access criteria (2025): https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access
- Spotify quota modes: https://developer.spotify.com/documentation/web-api/concepts/quota-modes
- Spotify Web API reference: https://developer.spotify.com/documentation/web-api/reference
