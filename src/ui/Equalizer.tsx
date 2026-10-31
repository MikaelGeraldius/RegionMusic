import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

const BARS = [520, 380, 640, 450];
const HEIGHT = 16;

// Bouncing bars while music plays; flat when it doesn't.
export function Equalizer({ playing, color }: { playing: boolean; color: string }) {
  const [values] = useState(() => BARS.map(() => new Animated.Value(0.3)));

  useEffect(() => {
    if (!playing) {
      values.forEach((v) => v.setValue(0.3));
      return;
    }
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: BARS[i], easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.25, duration: BARS[i], easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [playing, values]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: HEIGHT, gap: 3 }}>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: HEIGHT,
            borderRadius: 2,
            backgroundColor: color,
            transform: [{ translateY: HEIGHT / 2 }, { scaleY: v }, { translateY: -HEIGHT / 2 }],
          }}
        />
      ))}
    </View>
  );
}
