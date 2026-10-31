import { StyleSheet, View } from 'react-native';

import type { RegionKind } from '../region/lookup';

// Tiny drawn glyphs (no icon library, so no native rebuild):
// city = skyline, town = house, route = dotted path.
export function KindIcon({ kind, color, size = 16 }: { kind: RegionKind; color: string; size?: number }) {
  const u = size / 16;
  if (kind === 'city') {
    return (
      <View style={[styles.row, { width: size, height: size, gap: 2 * u }]}>
        {[8, 14, 11].map((h, i) => (
          <View key={i} style={{ width: 4 * u, height: h * u, borderRadius: u, backgroundColor: color }} />
        ))}
      </View>
    );
  }
  if (kind === 'town') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View
          style={{
            position: 'absolute',
            top: 2 * u,
            width: 9 * u,
            height: 9 * u,
            borderRadius: u,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View style={{ width: 11 * u, height: 8 * u, borderRadius: u, backgroundColor: color }} />
      </View>
    );
  }
  return (
    <View style={[styles.row, { width: size, height: size, alignItems: 'center', gap: 2 * u }]}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 4 * u, height: 4 * u, borderRadius: 2 * u, backgroundColor: color }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
});
