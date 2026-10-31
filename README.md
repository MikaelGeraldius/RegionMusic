# RegionMusic

A personal app that plays Pokemon Emerald themes for where you are: a **city** theme inside malls and large buildings, a **town** theme inside housing complexes, and a **route** theme everywhere else. It keeps playing with the phone locked, and crossfades when you move into a new area.

The songs aren't in this repo. Add your own audio files (see below).

## How it works

1. A background location task gets a GPS fix every ~25 m, with the phone locked.
2. After moving 75 m or more, it asks OpenStreetMap (Nominatim) what's at that spot:
   - inside a mall/department store, or a building of 5000 m² or more -> **city**
   - inside a named residential area or a *komplek/perumahan/cluster* -> **town**
   - anything else -> **route**, named after the kelurahan
3. A new area must show up on 2 fixes, at least 10 s apart, before the music switches, so GPS jitter at borders doesn't flip it.
4. The area's id picks a theme from that kind's folder, so the same place always plays the same song. Themes loop and crossfade over 2.5 s.
5. Tracking and music start on their own when you open the app. Everything is written to the on-screen event log.

## Adding the music

Put audio files (`.mp3`, `.m4a`, `.aac` or `.wav`) in:

```
assets/music/city/    e.g. "Rustboro City.mp3", "Slateport City.mp3", "Lilycove City.mp3"
assets/music/town/    e.g. "Littleroot Town.mp3", "Oldale Town.mp3", "Fallarbor Town.mp3"
assets/music/route/   e.g. "Route 101.mp3", "Route 104.mp3", "Route 119.mp3"
```

The file name becomes the song title, and a leading track number is dropped. Then run `npm run music`, which regenerates `src/music/tracks.generated.ts`. `npm start`, `npm run android` and `npm run ios` also run it. Both the folder and the generated file are git-ignored.

## Running it

A development build is needed: background location and `expo-audio` don't work in Expo Go.

- Android, local: `npx expo run:android` with the phone connected over USB. Needs JDK 17 on `JAVA_HOME` and `ANDROID_HOME` pointing at the Android SDK. The first build takes about 25 minutes.
  - Xiaomi/POCO/Redmi: turn on **Install via USB** in Developer options, and set RegionMusic's battery saver to **No restrictions**.
  - After that, `npx expo start --dev-client` (not with `CI=1`) and `adb reverse tcp:8081 tcp:8081`.
- iOS: `npx eas-cli@latest build --profile development --platform ios` (needs a paid Apple Developer account).

When asked for location, choose **Allow all the time** / **Always**.

## Field test checklist

- Open the app; the banner should show your area and a theme should start.
- Lock the phone and walk into a mall, a housing complex and back out to a road.
- Check the event log: did each switch happen, and how long after?
- Note battery use over about an hour.
