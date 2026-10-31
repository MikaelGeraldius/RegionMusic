import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { Region } from '../region/lookup';
import { Equalizer } from './Equalizer';
import { KindIcon } from './KindIcon';
import { color, kindStyle, space, type } from './theme';

type Props = { region: Region | null; song: string | null; tracking: boolean };

// The screen's hero. Entering a new area is the peak moment: the card pops in
// with that area's colour, like a location sign in a game.
export function AreaCard({ region, song, tracking }: Props) {
  const [pop] = useState(() => new Animated.Value(1));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!region) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [region?.id, pop]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gentle "searching" pulse while there's no area yet.
  useEffect(() => {
    if (region || !tracking) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [region, tracking, pulse]);

  if (!region) {
    return (
      <View style={[styles.card, { shadowColor: color.ink }]}>
        <Animated.View style={[styles.searchDot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
        <Text style={[type.hero, styles.name]}>{tracking ? 'Finding where you are' : 'Music is off'}</Text>
        <Text style={[type.body, { color: color.inkMuted }]}>
          {tracking
            ? 'Hang on a few seconds. Your area and its theme show up here.'
            : 'Tap Start music and the theme for your area plays on its own.'}
        </Text>
      </View>
    );
  }

  const k = kindStyle[region.kind];
  const playing = tracking && !!song;
  return (
    <Animated.View
      style={[
        styles.card,
        {
          shadowColor: k.accent,
          borderColor: k.tint,
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: k.tint }]}>
        <KindIcon kind={region.kind} color={k.accent} size={14} />
        <Text style={[type.caption, styles.badgeText, { color: k.accent }]}>{k.label.toUpperCase()}{region.home ? '  ·  HOME' : ''}</Text>
      </View>

      <Text style={[type.hero, styles.name]} numberOfLines={2}>
        {region.name}
      </Text>

      <View style={styles.divider} />

      <View style={styles.nowPlaying}>
        <View style={[styles.eqBox, { backgroundColor: k.tint }]}>
          <Equalizer playing={playing} color={k.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.caption, { color: color.inkMuted }]}>{playing ? 'Now playing' : 'Paused'}</Text>
          <Text style={[type.body, styles.song]} numberOfLines={1}>
            {song ?? 'Starting the theme…'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.l,
    gap: space.s,
    elevation: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.m - 4,
    paddingVertical: space.xs + 2,
    borderRadius: 999,
    marginBottom: space.xs,
  },
  badgeText: { fontWeight: '600', letterSpacing: 1 },
  name: { color: color.ink },
  divider: { height: 1, backgroundColor: color.line, marginVertical: space.s },
  nowPlaying: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  eqBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  song: { color: color.ink, fontWeight: '600' },
  searchDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.live, marginBottom: space.s },
});
