# Task Plan: Region-based music app ("every street has its theme")

## Goal
An iOS + Android app that, while you walk or drive with the phone locked, detects what kind of place you're in and autoplays a Pokemon Emerald theme for it: malls/large buildings = city theme, housing complexes = town theme, everywhere else = route theme. Personal use only (2026-10-31: Spotify dropped; songs are the user's own audio files bundled in the app).

## Next Step
User copies Emerald audio into assets/music/{city,town,route}/, then rebuild: `npm run android` (native modules changed: expo-audio added, Spotify/auth modules removed). Then open the app (tracking autostarts) and do the locked-phone walk below.
Previously: locked-phone walk across a region border (Spotify open in background, RegionMusic battery saver = No restrictions), then a 1-hour battery check (read Android Settings > Battery > app usage for RegionMusic and Spotify; note start/end %); then go/no-go for Phase 2. Event log now keeps 300 entries, so a full walk fits.
To resume: plug in the phone, `npx expo start --dev-client` (NOT with CI=1, it disables file watching), `adb reverse tcp:8081 tcp:8081`, open RegionMusic. Spotify login, Client ID (.env.local) and playlists are already set up on the phone.

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
- [x] Development build installed on a phone (Android: Xiaomi POCO 22111317PG, local Gradle build, app loads)
- [x] On device: location -> region (Nominatim) -> Spotify plays a playlist (Kalideres, 2026-10-30)
- [ ] Field test: background location with screen locked, Spotify switches on border crossings
- [ ] iOS: confirm background task stays alive and HTTP calls succeed while Spotify plays
- [ ] Measure battery drain over a 1-hour walk
- [ ] Android volume fade -> moved to Phase 4 (needs a native volume module)
- [ ] Go / no-go: stay on Expo or add native modules
- [x] 2026-10-31 pivot: drop Spotify login; classify place as city/town/route (Nominatim zoom 18 + 15 with polygons); local Emerald music via expo-audio with autoplay + crossfade (code written, needs rebuild)
- [ ] User copies Emerald audio files into assets/music/{city,town,route}/ and runs `npm run music`
- [ ] Rebuild dev client (expo-audio is native), field-test locked-phone playback
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
| ~~No Pokemon/Nintendo music~~ -> Emerald music, personal use, user supplies the files (2026-10-31) | User's own app; Claude doesn't download the songs |
| Spotify dropped (2026-10-31); local playback with expo-audio | No login, full control: autoplay, looping, crossfade on both platforms |
| Region kinds: city (mall / building >= 5000 m2), town (named residential complex), route (else, named by kelurahan) | User's mapping; Nominatim gives malls at zoom 18 and complexes at zoom 15 |
| Spotify via Web API (not App Remote) | HTTPS calls work from the background location task |
| Default transition: switch at song end | Only smooth option on iOS; Android adds a volume fade |
| Scope: personal / small allowlisted group | Spotify dev-mode limits; public launch blocked without extended access |
| Stack: Expo dev build + TypeScript | Cross-platform; revisit after Phase 2 |
| Launch area Jabodetabek; region = kelurahan, fallback kecamatan | Neighborhood-sized units; huge metro so fetch by radius |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| On device: "Error: Overpass 406" | overpass-api.de rejects the default okhttp User-Agent (curl confirmed: okhttp/none -> 406, named UA -> 200); send `User-Agent: RegionMusic/0.1` |
| Still 406 on device; then all Overpass servers (overpass-api.de, kumi, private.coffee) time out on TCP connect from the user's network, mail.ru 504 | Switched region lookup to Nominatim reverse (zoom 13 -> kelurahan relation, e.g. Gambir 5802247, Pondok Cina 14737184), reachable from this network; src/region/overpass.ts -> lookup.ts |
| Phone kept running old code after edits (bundle had overpass-api.de, not nominatim) | Cause: Metro was started with `CI=1`, which turns off file watching. Start it without `CI=1`, and check the served bundle with curl after edits |
| Walk: still only "Tracking started"; logcat showed task runs every ~7 s finishing in <10 ms | `busy` guard stuck: an earlier network call never returned (fetch has no timeout). Added fetchWithTimeout (15 s) for all requests; guard expires after 60 s |
| After that: silent while standing still | Region cached within 75 m and unchanged = nothing logged. Start tracking now resets the remembered region so the current one plays immediately. Verified on device 23:52: Fix -> Kalideres, then Spotify reached ("no device") |
| Still only "Tracking started" | dumpsys location: app's HIGH_ACCURACY GPS request pending indoors, so getCurrentPositionAsync(High) never resolved. First fix now = last known (<60 s) or Balanced (Wi-Fi/cell) |
| On device: only "Tracking started", nothing after | Location updates only come after moving 25 m, and inaccurate/no-region fixes were silent. Now process the current position at start and log every lookup and skipped fix |
| adb install: INSTALL_FAILED_USER_RESTRICTED (Xiaomi) | User turned on "Install via USB"; retry succeeded |
| expo-doctor: duplicate expo-constants | `npm dedupe`; 20/20 checks pass |
| git clone / npm in the app-made session folder failed (path redirected) | Moved the project to Desktop/MikaelStuff/Projects/RegionMusic |
| Python edit of findings.md: FileNotFoundError | App folder is redirected for packaged apps; Python sees a different path. Use editor tools for files here. |
