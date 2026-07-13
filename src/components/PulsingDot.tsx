/**
 * Punto pulsante que indica escaneo activo
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../utils/theme';

interface PulsingDotProps {
  active?: boolean;
  color?: string;
  size?: number;
}

export function PulsingDot({ active = true, color = colors.success, size = 8 }: PulsingDotProps) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
      scale.value = withRepeat(
        withTiming(1.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      opacity.value = 0.4;
      scale.value = 1;
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.dot,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  dot: {},
});
