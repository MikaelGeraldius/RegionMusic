# Progress Log

## Session: 2026-10-30

### Current Status
- **Phase:** 1 - Requirements & Discovery
- **Started:** 2026-10-30

### Actions Taken
- Initialized planning files.
- Wrote findings: region detection approaches, OSM data, crossfade audio, music licensing options, stack options, battery/permissions.
- Wrote 8-phase plan; Phase 2 is a feasibility spike for background location + audio.
- User answered: iOS + Android, Spotify as music source, neighborhoods + street toggle, own city online.
- Researched Spotify limits (dev-mode allowlist, Premium, no volume control on iOS); recorded in findings.md.
- Rewrote plan to 7 phases around Spotify (audio engine replaced by Spotify playback controller).
- City: Jabodetabek. Recorded OSM admin levels (kelurahan/kecamatan), local region types, GPS/travel conditions. Phase 1 complete.
- Phase 2 started. Project at Desktop/MikaelStuff/Projects/RegionMusic, branch `phase-2-spike`.
- Read Expo SDK 58 docs (location, task-manager, auth-session, secure-store) and Spotify PKCE docs; notes in findings.md.
- Wrote: src/config.ts, src/storage.ts, src/hash.ts, src/spotify/{auth,api}.ts, src/region/{overpass,tracker}.ts, src/background/locationTask.ts, App.tsx (test screen), app.json (scheme, ids, location plugin), .env.example, README.md.
- Added eas.json + ESLint (commit 70957c8). User chose a local build: installed Microsoft OpenJDK 17, set JAVA_HOME/ANDROID_HOME, built the APK, installed it on the POCO, and loaded the app over USB (adb reverse 8081).
- Waiting on: Spotify developer app + Client ID in .env.local.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `npx tsc --noEmit` | no errors | no errors | pass |
| `npx expo-doctor` | all checks pass | 20/20 after `npm dedupe` | pass |
| Tracker hysteresis (5 cases, ad hoc node script) | first region plays; jitter ignored; switch after 2 fixes / 10 s | all 5 as expected | pass |
| Overpass is_in at Monas (-6.1754, 106.8272) | kelurahan + kecamatan | Gambir (7), Gambir (6) | pass |
| Native config (expo config introspect) | iOS UIBackgroundModes location; Android background + foreground-service location | present | pass |
| `npx expo lint` | no errors | exit 0 | pass |
| Local Android build (`gradlew assembleDebug`) | APK | BUILD SUCCESSFUL in 26m | pass |
| Install on POCO 22111317PG | installed | Success after enabling Install via USB | pass |
| App loads from dev server over USB | test screen | screen shows, redirect URI regionmusic://callback | pass |
| Spotify login on device | logged in | "Log out of Spotify" shown after login | pass |
| Start tracking -> region (after fixes) | Fix + region in log | Fix -6.12690,106.70445 ±20 m -> Kalideres | pass |
| Region switch -> Spotify call | playlist plays | first try "no Spotify device"; with Spotify open, music plays (user confirmed) | pass |
| Locked-phone walk across a border | music switches | not yet | pending |

### Errors
| Error | Resolution |
|-------|------------|
