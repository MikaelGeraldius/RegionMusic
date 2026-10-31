import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { isTracking, startTracking, stopTracking } from './src/background/locationTask';
import { nowPlaying } from './src/music/player';
import { TRACKS } from './src/music/tracks.generated';
import type { Region } from './src/region/lookup';
import {
  clearLog,
  loadState,
  readLog,
  readVisits,
  type LogEntry,
  type Visit,
} from './src/storage';
import { AreaCard } from './src/ui/AreaCard';
import { Journey, TodayStats } from './src/ui/Journey';
import { color, space, type } from './src/ui/theme';

const TOP_INSET = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 48;
const BUTTON_HEIGHT = 56;

export default function App() {
  const [tracking, setTracking] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [song, setSong] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const state = await loadState();
    const on = await isTracking();
    setTracking(on);
    const current = on ? state.tracker.current : null;
    const visitList = await readVisits();
    setRegion(current);
    // The player may live in another JS runtime (background launch) or have been
    // reset by a reload, so prefer the stored visit for the current area.
    const latest = visitList[0];
    setSong(current && latest?.name === current.name ? latest.song : nowPlaying());
    setVisits(visitList);
    setEntries(await readLog());
  }, []);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      setMessage(await startTracking());
    } catch (e) {
      setMessage(`Couldn't start: ${(e as Error).message}`);
    }
    setBusy(false);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    // Autoplay: start as soon as the app opens.
    (async () => {
      if (!(await isTracking())) await start();
      await refresh();
    })();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [refresh, start]);

  const toggle = async () => {
    if (tracking) {
      setBusy(true);
      await stopTracking();
      setBusy(false);
      await refresh();
    } else {
      await start();
    }
  };

  const themes = TRACKS.city.length + TRACKS.town.length + TRACKS.route.length;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[type.caption, styles.appName]}>REGIONMUSIC</Text>
          <View style={[styles.pill, tracking && styles.pillLive]}>
            <View style={[styles.pillDot, { backgroundColor: tracking ? color.live : color.inkMuted }]} />
            <Text style={[type.caption, { color: tracking ? color.live : color.inkMuted, fontWeight: '600' }]}>
              {tracking ? 'Listening' : 'Off'}
            </Text>
          </View>
        </View>

        <AreaCard region={region} song={song} tracking={tracking} />

        {message && (
          <View style={styles.error}>
            <Text style={[type.body, { color: color.error }]}>{message}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[type.body, styles.sectionTitle]}>Today</Text>
          <TodayStats visits={visits} />
        </View>

        <View style={styles.section}>
          <Text style={[type.body, styles.sectionTitle]}>Journey</Text>
          <Journey visits={visits} />
        </View>

        <View style={styles.section}>
          <Pressable onPress={() => setShowLog((s) => !s)} hitSlop={12} style={styles.logToggle}>
            <Text style={[type.caption, { color: color.inkMuted, fontWeight: '600' }]}>
              {showLog ? 'Hide event log' : `Show event log (${entries.length})`}
            </Text>
            <Text style={[type.caption, { color: color.inkMuted }]}>{themes} themes loaded</Text>
          </Pressable>
          {showLog && (
            <View style={styles.log}>
              {entries.slice(0, 80).map((e, i) => (
                <Text key={`${e.t}-${i}`} style={[type.caption, styles.logLine]}>
                  {new Date(e.t).toLocaleTimeString()}  {e.msg}
                </Text>
              ))}
              <Pressable
                onPress={async () => {
                  await clearLog();
                  await refresh();
                }}
                style={styles.clear}
              >
                <Text style={[type.caption, { color: color.ink, fontWeight: '600' }]}>Clear log</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Primary action in the thumb zone. */}
      <View style={styles.footer}>
        <Pressable
          onPress={toggle}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            tracking ? styles.buttonStop : styles.buttonStart,
            (pressed || busy) && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={tracking ? styles.stopIcon : styles.playIcon} />
          <Text style={[type.body, styles.buttonText, { color: color.ink }]}>
            {busy ? 'One moment…' : tracking ? 'Stop music' : 'Start music'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: {
    paddingTop: TOP_INSET + space.m,
    paddingHorizontal: space.m + 4,
    paddingBottom: BUTTON_HEIGHT + space.xxl + space.l,
    gap: space.l,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appName: { color: color.inkMuted, fontWeight: '600', letterSpacing: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.m - 4,
    paddingVertical: space.xs + 2,
    borderRadius: 999,
    backgroundColor: color.line,
  },
  pillLive: { backgroundColor: color.liveTint },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  error: { borderRadius: 16, padding: space.m, backgroundColor: color.errorTint },
  section: { gap: space.m, marginTop: space.s },
  sectionTitle: { color: color.ink, fontWeight: '600' },
  logToggle: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, alignItems: 'center' },
  log: { borderRadius: 16, backgroundColor: color.line, padding: space.m, gap: space.xs },
  logLine: { color: color.inkBody, fontFamily: 'monospace' },
  clear: { alignSelf: 'flex-start', marginTop: space.s, minHeight: 44, justifyContent: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.m + 4,
    paddingTop: space.m,
    paddingBottom: space.l,
    backgroundColor: color.footer,
  },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.m - 4,
  },
  buttonStart: { backgroundColor: color.primary, shadowColor: color.primaryShadow, elevation: 4 },
  buttonStop: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  buttonText: { fontWeight: '600' },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: color.ink,
  },
  stopIcon: { width: 12, height: 12, borderRadius: 2, backgroundColor: color.ink },
});
