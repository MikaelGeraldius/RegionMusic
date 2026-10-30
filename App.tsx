import * as AuthSession from 'expo-auth-session';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { isTracking, startTracking, stopTracking } from './src/background/locationTask';
import {
  APP_SCHEME,
  REDIRECT_PATH,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_DISCOVERY,
  SPOTIFY_SCOPES,
} from './src/config';
import { parsePlaylistId } from './src/spotify/api';
import { clearTokens, isLoggedIn, saveTokens } from './src/spotify/auth';
import { clearLog, loadState, readLog, saveState, type LogEntry } from './src/storage';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({ scheme: APP_SCHEME, path: REDIRECT_PATH });

// Phase 2 test screen: log in, set playlists, start tracking, watch the event log.
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [playlistText, setPlaylistText] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: SPOTIFY_CLIENT_ID, scopes: SPOTIFY_SCOPES, redirectUri, usePKCE: true },
    SPOTIFY_DISCOVERY,
  );

  const refresh = useCallback(async () => {
    const state = await loadState();
    setRegion(state.tracker.current?.name ?? null);
    setEntries(await readLog());
    setTracking(await isTracking());
  }, []);

  useEffect(() => {
    (async () => {
      setLoggedIn(await isLoggedIn());
      const state = await loadState();
      setPlaylistText(state.playlists.join('\n'));
      await refresh();
    })();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (response?.type !== 'success' || !request?.codeVerifier) return;
    (async () => {
      try {
        const tokens = await AuthSession.exchangeCodeAsync(
          {
            clientId: SPOTIFY_CLIENT_ID,
            code: response.params.code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier! },
          },
          SPOTIFY_DISCOVERY,
        );
        if (!tokens.refreshToken) throw new Error('Spotify returned no refresh token');
        await saveTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn ?? 3600);
        setLoggedIn(true);
        setMessage(null);
      } catch (e) {
        setMessage(`Login failed: ${(e as Error).message}`);
      }
    })();
  }, [response, request]);

  const savePlaylists = async () => {
    const lines = playlistText.split(/\s+/).filter(Boolean);
    const ids = lines.map(parsePlaylistId);
    const bad = lines.filter((_, i) => !ids[i]);
    const state = await loadState();
    state.playlists = ids.filter((id): id is string => id !== null);
    await saveState(state);
    setMessage(
      bad.length
        ? `Saved ${state.playlists.length}; not playlist links: ${bad.join(', ')}`
        : `Saved ${state.playlists.length} playlist(s)`,
    );
  };

  const toggleTracking = async () => {
    try {
      if (tracking) {
        await stopTracking();
      } else {
        setMessage(await startTracking());
      }
    } catch (e) {
      setMessage(`Tracking error: ${(e as Error).message}`);
    }
    await refresh();
  };

  const logout = async () => {
    await stopTracking();
    await clearTokens();
    setLoggedIn(false);
    await refresh();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>RegionMusic (Phase 2 spike)</Text>
      <Text style={styles.region}>{region ?? 'No region yet'}</Text>

      {!SPOTIFY_CLIENT_ID && (
        <Text style={styles.warn}>Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID in .env.local</Text>
      )}

      {loggedIn ? (
        <Button title="Log out of Spotify" onPress={logout} />
      ) : (
        <Button
          title="Log in with Spotify"
          disabled={!request || !SPOTIFY_CLIENT_ID}
          onPress={() => promptAsync()}
        />
      )}

      <Text style={styles.label}>Playlist links (one per line)</Text>
      <TextInput
        style={styles.input}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        value={playlistText}
        onChangeText={setPlaylistText}
        placeholder="https://open.spotify.com/playlist/..."
      />
      <Button title="Save playlists" onPress={savePlaylists} />

      <View style={styles.spacer} />
      <Button
        title={tracking ? 'Stop tracking' : 'Start tracking'}
        disabled={!loggedIn}
        onPress={toggleTracking}
      />
      {message && <Text style={styles.message}>{message}</Text>}

      <View style={styles.logHeader}>
        <Text style={styles.label}>Event log</Text>
        <Button title="Clear" onPress={async () => { await clearLog(); await refresh(); }} />
      </View>
      <FlatList
        data={entries}
        keyExtractor={(e, i) => `${e.t}-${i}`}
        renderItem={({ item }) => (
          <Text style={styles.logLine}>
            {new Date(item.t).toLocaleTimeString()}  {item.msg}
          </Text>
        )}
      />
      <Text style={styles.hint}>Redirect URI: {redirectUri}</Text>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '600', marginTop: 24 },
  region: { fontSize: 28, fontWeight: '700' },
  warn: { color: '#b00020' },
  label: { fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  spacer: { height: 4 },
  message: { color: '#333' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logLine: { fontSize: 12, fontFamily: 'monospace', paddingVertical: 2 },
  hint: { fontSize: 11, color: '#888' },
});
