# Task Plan: Region-based music app ("every street has its theme")

## Goal
An iOS + Android app that, while you walk or drive with the phone locked, detects which neighborhood/park (or, optionally, street) you're in and plays that place's music from your Spotify, switching smoothly when you cross into a new region - like towns and routes in old Pokemon games.

## Next Step
User registers the Spotify developer app (redirect URI `regionmusic://callback`), puts the Client ID in `.env.local`, and makes a development build to field-test on a phone (see README.md).

## Current Phase
Phase 2

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints (background location, Spotify limits, battery, GPS jitter)
- [x] Document in findings.md
- [x] Platforms: iOS + Android
- [x] Music source: Spotify (Premium, dev-mode allowlist, personal scale)
- [x] Granularity: neighborhoods/parks, street-level toggle
- [x] Area: Jabodetabek, Indonesia (online region data for now)
- **Status:** complete

### Phase 2: Feasibility Spike (riskiest parts first)
- [ ] Register Spotify developer app (user); add own account to the allowlist; check the current user cap
- [x] Expo SDK 58 project (TypeScript) in RegionMusic/, branch `phase-2-spike`
- [x] Spotify login (Authorization Code + PKCE) with token refresh usable from background (code written, not run)
- [x] Background location task + Overpass kelurahan lookup + hysteresis tracker (code written; tracker unit-checked; Overpass checked live at Monas)
- [x] Region switch -> Spotify Web API play playlist at hash-based start track (code written, not run)
- [x] Typecheck, expo-doctor (20/20), native config has background location on iOS + Android
- [ ] Development build installed on a phone (Android first)
- [ ] Field test: background location with screen locked, Spotify switches on border crossings
- [ ] iOS: confirm background task stays alive and HTTP calls succeed while Spotify plays
- [ ] Measure battery drain over a 1-hour walk
- [ ] Android volume fade -> moved to Phase 4 (needs a native volume module)
- [ ] Go / no-go: stay on Expo or add native modules
- **Status:** in_progress

### Phase 3: Region Engine
- [ ] Verify Jabodetabek OSM coverage: kelurahan (admin_level 7) and kecamatan (6) boundaries, parks, malls, campuses, toll roads
- [ ] Overpass queries around the user's position (radius-based, never all of Jabodetabek): kelurahan, parks, malls, water, campuses, streets
- [ ] Toll roads (`highway=motorway`) as "route" regions for driving
- [ ] Cache fetched regions on device (tile/area based), refresh when leaving cached area
- [ ] Spatial index (rbush) + point-in-polygon for areas
- [ ] Street mode: nearest street segment within ~20 m (toggle in settings)
- [ ] Priority for nested regions (park > street > neighborhood > city)
- [ ] Hysteresis: dwell time / consecutive fixes + GPS accuracy filter
- [ ] Unit tests with recorded GPS traces, including border jitter
- **Status:** pending

### Phase 4: Spotify Playback Controller
- [ ] Region type -> Spotify playlist mapping (user picks playlists; app can suggest via search)
- [ ] Pin a specific playlist/track to a specific region
- [ ] Deterministic start track: hash(region id) -> index in playlist
- [ ] Transition modes: "at song end" (default, max wait ~90 s), "fade now" (Android), "instant"
- [ ] Cancel/redirect a pending switch if the region changes again
- [ ] Handle: no active Spotify device, Spotify app closed, token expiry, rate limits (429), non-Premium account
- [ ] Don't fight the user: if they skip/pause manually in Spotify, back off
- **Status:** pending

### Phase 5: App UI
- [ ] Game-style "location banner" when entering a region (name + playlist)
- [ ] Map view showing nearby regions and their assigned playlists
- [ ] Onboarding: Spotify login, "Always" location permission, notification permission
- [ ] Settings: street mode, transition mode, sensitivity, region types on/off, playlist per type
- **Status:** pending

### Phase 6: Hardening & Field Testing
- [ ] Real walks, motorbike/car rides and KRL/MRT trips in Jabodetabek; log switches vs. ground truth
- [ ] Test in high-rise areas (Sudirman/Thamrin/Kuningan) for GPS multipath; keep music steady in underground MRT
- [ ] Tune hysteresis, distance filter, accuracy thresholds
- [ ] Battery optimization (stationary pause, motion-based rates)
- [ ] Poor/no connection behavior (keep current music, retry)
- **Status:** pending

### Phase 7: Delivery (personal / friends)
- [ ] TestFlight (iOS) and internal testing / APK (Android) for allowlisted users
- [ ] Privacy note: location stays on device; only Spotify commands leave it
- [ ] Decide later: public release needs Spotify extended access (business + ~250k MAU) or a non-Spotify music mode
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Spike background location + Spotify control before building features | Riskiest part; if the OS or Spotify blocks it, the app doesn't work |
| Local point-in-polygon, not OS geofences | Geofence limits (20 on iOS) and circle-only shapes |
| OpenStreetMap via Overpass, fetched online + cached | Free, global; user wants online for now |
| Hysteresis on region switches | GPS jitter would make music flap at borders |
| No Pokemon/Nintendo music | Copyright |
| Spotify via Web API (not App Remote) | HTTPS calls work from the background location task |
| Default transition: switch at song end | Only smooth option on iOS; Android adds a volume fade |
| Scope: personal / small allowlisted group | Spotify dev-mode limits; public launch blocked without extended access |
| Stack: Expo dev build + TypeScript | Cross-platform; revisit after Phase 2 |
| Launch area Jabodetabek; region = kelurahan, fallback kecamatan | Neighborhood-sized units; huge metro so fetch by radius |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| expo-doctor: duplicate expo-constants | `npm dedupe`; 20/20 checks pass |
| git clone / npm in the app-made session folder failed (path redirected) | Moved the project to Desktop/MikaelStuff/Projects/RegionMusic |
| Python edit of findings.md: FileNotFoundError | App folder is redirected for packaged apps; Python sees a different path. Use editor tools for files here. |
