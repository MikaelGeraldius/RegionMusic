# RegionMusic

Plays music from your Spotify based on the neighborhood you're in, like towns and routes in old Pokemon games. This is the **Phase 2 spike**: it proves that background location and Spotify control work together on a real phone.

## How the spike works

1. A background location task gets a GPS fix every ~25 m, with the phone locked.
2. After moving 75 m or more, it asks OpenStreetMap (Overpass) which kelurahan (or, if none is mapped, kecamatan) you're in.
3. A new region must show up on 2 fixes, at least 10 s apart, before the music switches, so GPS jitter at borders doesn't flip it.
4. On a switch, it picks one of your playlists by hashing the region id (same place, same playlist and same starting song) and tells Spotify to play it.
5. Everything is written to the on-screen event log.

Switching is instant for now. The "switch at song end" and Android fade modes come in Phase 4.

## Setup

1. **Spotify app**: at https://developer.spotify.com/dashboard, create an app that uses the **Web API**, and add this Redirect URI exactly:
   `regionmusic://callback`
   Under *User Management*, add the Spotify accounts that will test it. A Spotify **Premium** account is required.
2. **Client ID**: copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`.
3. **Development build**: background location doesn't work in Expo Go.
   - Android, local: `npx expo run:android` with a phone connected over USB. Needs JDK 17 on `JAVA_HOME` (`winget install Microsoft.OpenJDK.17`) and `ANDROID_HOME` pointing at the Android SDK. The first build takes about 25 minutes.
     - Xiaomi/POCO/Redmi: also turn on **Install via USB** in Developer options, or the install fails with `INSTALL_FAILED_USER_RESTRICTED`.
     - After the first install, `npx expo start` is enough. Over USB, run `adb reverse tcp:8081 tcp:8081` so the phone can reach the dev server.
   - Android or iOS, in the cloud: `npx eas-cli@latest build --profile development --platform android|ios` (needs a free Expo account; iOS also needs a paid Apple Developer account).
   - Then `npx expo start` and open the app on the phone.

## Field test checklist

- Log in, paste 2-5 playlist links, tap **Save playlists**.
- Open Spotify and play anything once, so the phone shows up as a Spotify device.
- Tap **Start tracking** and choose **Allow all the time** / **Always**.
- Lock the phone and walk or ride across a few kelurahan borders.
- Check the event log: did each border crossing switch the music, and how long after?
- Note battery use over about an hour.
