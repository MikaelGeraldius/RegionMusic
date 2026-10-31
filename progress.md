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

## Session: 2026-10-31
- Resumed Phase 2. Remaining items are on-device field tests (locked walk, battery, iOS); phone not connected.
- Prep for the walk: event log cap 60 -> 300 (src/storage.ts), since a 1-hour walk produces ~65+ entries. tsc + lint pass.
- Battery check plan: no expo-battery (would need a native rebuild); read Android battery usage per app instead.
- Pivot (user): personal app, Pokemon Emerald themes, no Spotify, city/town/route areas, autoplay.
  - src/region/lookup.ts: city/town/route classifier (Nominatim reverse z18 + mall search/lookup + z15), throttled 1.1 s between requests. Live-tested on 10 Jakarta points (see findings).
  - src/music/player.ts: expo-audio, looping theme per area (hash of area id), 2.5 s equal-power crossfade, lock-screen controls for Android background playback.
  - scripts/gen-music.js + `npm run music`: assets/music/{city,town,route}/ -> src/music/tracks.generated.ts (both git-ignored).
  - Removed src/spotify, .env.example, expo-auth-session/crypto/web-browser/secure-store. Added expo-audio, expo-asset. App.tsx: no login, tracking starts on open.
  - tsc, lint pass; expo-doctor 20/20. Not run on the phone yet: needs a rebuild (native modules changed) and music files.
- User added 21 MP3s from khinsider (Emerald Enhanced rip). Renamed to plain ASCII titles (e.g. "Rustboro City.mp3", "Route 111 Desert.mp3"); `npm run music` -> city 9, town 5, route 7.
- Rebuild: `expo prebuild --platform android --clean` + `gradlew assembleDebug` (JAVA_HOME/ANDROID_HOME are user env vars; this shell didn't load them, so they're set per command). Phone not connected at the time.
- Build OK (13.5 min), installed on the POCO. Metro now runs from .claude/launch.json ("metro"). First launch failed with "unexpected end of stream" because the app connected before Metro was ready; relaunch fixed it.
- On device: tracking autostarted; first indoor fix (Wi-Fi, ±100 m) was skipped, so nothing played. Added `maxStartAccuracyM: 200` for the first fix after starting. Result: "Entered Pegadungan (Route) -> Route 120"; `dumpsys media_session` shows the RegionMusic session PLAYING "Route 120, Pegadungan" with lock-screen controls.
- Still to test: locked-phone walk into a mall/complex (city/town switch + crossfade), battery.
- Installed skill `mobile-app-ui-design` (github.com/ceorkm/mobile-app-ui-design @0ad61f0, Markdown only, reviewed) to ~/.claude/skills/. Redesigned the screen with it: src/ui/{theme,KindIcon,Equalizer,AreaCard,Journey}.tsx + App.tsx. Area "sign" card that pops in per area (peak), Today tally per kind (end), journey timeline (visits stored in storage.ts), event log collapsed, Start/Stop pinned in the thumb zone. 60/30/10 colors, 4 font sizes / 2 weights, 8-pt grid. No new native deps (built-in Animated, drawn icons). Verified on the phone in playing and off states.
- Bug (user): Stop didn't stop the music. Cause: player state was module-scoped; JS reloads re-created the module and orphaned the playing player (dumpsys showed several leftover RegionMusic media sessions). Also an in-flight lookup could start music after Stop. Fix (src/music/player.ts): state on globalThis, registry of every player, stopMusic releases all + bumps a generation; switches/crossfades from an older generation are dropped (locationTask passes the generation captured before the lookup). Verified: after a fresh start + Stop, no RegionMusic media session or started player remains, and none 10 s later.
- Custom towns (user): Citra Garden and Alam Sutera -> town. src/region/customTowns.ts, checked locally after the city checks. Citra Garden = within 300 m of any Citra Garden road/outline in Kalideres (65 sampled points; Puri excluded, it's a separate mapped estate). Alam Sutera = OSM suburb outline (relation 19557906). Live results: Jalan Satu Maret (user's spot, 245 m from CG roads), CG2/CG8/CG City -> town Citra Garden; Kalideres station -> route; Alam Sutera center -> town; Mall @ Alam Sutera, Living World, Jakarta Premium Outlets -> still city. UMN (amenity=university campus) -> route Curug Sangereng; Scientia Residences next to it -> town.
- City rule widened (user): any outline you're inside of >= 5000 m2 is a city whatever its tag (campus, hospital, station, stadium), except land-type categories (highway, landuse, place, boundary, natural, waterway) and parks/pitches. Nearby search now covers 'mall' and 'university' (parking lot inside UMN hid the campus). UMN centre + parking -> city; point just east of the outline -> route. Lookups ~4.5 s.
- Home area (user): everywhere within 1 km of Citra Garden (src/region/home.ts). Region gets home: true and id suffix @home. Towns there play Littleroot Town, routes Route 101 / Route 104; cities keep the normal pool. Card badge shows "· HOME". Live: Jalan Satu Maret + CG8 -> town home (Littleroot), Kalideres station -> route home, Daan Mogot (2.6 km) -> normal route.
- Dark theme (user): theme.ts palette now dark (#111319 base, #1B1E27 cards, #F1EEE6 text, brighter kind accents); all hard-coded colors moved into tokens; light status bar. Verified on the phone.

### Errors
| Error | Resolution |
|-------|------------|
