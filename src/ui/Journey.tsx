import { StyleSheet, Text, View } from 'react-native';

import type { RegionKind } from '../region/lookup';
import type { Visit } from '../storage';
import { KindIcon } from './KindIcon';
import { color, kindStyle, space, type } from './theme';

const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const isToday = (t: number) => new Date(t).toDateString() === new Date().toDateString();

// Today's tally: the "end" of the day's story, values bigger than labels.
export function TodayStats({ visits }: { visits: Visit[] }) {
  const today = visits.filter((v) => isToday(v.t));
  return (
    <View style={styles.stats}>
      {(Object.keys(kindStyle) as RegionKind[]).map((kind) => {
        const k = kindStyle[kind];
        const n = today.filter((v) => v.kind === kind).length;
        return (
          <View key={kind} style={[styles.stat, { backgroundColor: k.tint }]}>
            <KindIcon kind={kind} color={k.accent} />
            <Text style={[type.stat, styles.statValue]}>{n}</Text>
            <Text style={[type.caption, { color: color.inkMuted }]}>
              {n === 1 ? k.label.toLowerCase() : k.plural}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Visual timeline of areas entered, newest first.
export function Journey({ visits }: { visits: Visit[] }) {
  if (visits.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[type.body, { color: color.ink, fontWeight: '600' }]}>Your journey starts here</Text>
        <Text style={[type.body, { color: color.inkMuted }]}>
          Walk or ride somewhere. Every mall, housing complex and road you pass shows up here with its theme.
        </Text>
      </View>
    );
  }
  return (
    <View>
      {visits.slice(0, 20).map((v, i, list) => {
        const k = kindStyle[v.kind];
        const last = i === list.length - 1;
        return (
          <View key={`${v.t}-${i}`} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: i === 0 ? k.accent : color.surface, borderColor: k.accent }]} />
              {!last && <View style={styles.railLine} />}
            </View>
            <View style={[styles.itemBody, !last && { paddingBottom: space.l }]}>
              <View style={styles.itemTop}>
                <Text style={[type.body, styles.itemName]} numberOfLines={1}>
                  {v.name}
                </Text>
                <Text style={[type.caption, styles.time]}>{time(v.t)}</Text>
              </View>
              <Text style={[type.caption, { color: color.inkMuted }]} numberOfLines={1}>
                <Text style={{ color: k.accent, fontWeight: '600' }}>{k.label}</Text>  ·  ♪ {v.song}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.s },
  stat: { flex: 1, borderRadius: 16, padding: space.m, gap: space.xs },
  statValue: { color: color.ink, fontVariant: ['tabular-nums'], marginTop: space.xs },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border,
    padding: space.l,
    gap: space.s,
  },
  item: { flexDirection: 'row', gap: space.m },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: space.xs },
  railLine: { flex: 1, width: 2, marginTop: space.xs, backgroundColor: color.line },
  itemBody: { flex: 1, gap: space.xs },
  itemTop: { flexDirection: 'row', alignItems: 'baseline', gap: space.s },
  itemName: { flex: 1, color: color.ink, fontWeight: '600' },
  time: { color: color.inkMuted, fontVariant: ['tabular-nums'] },
});
