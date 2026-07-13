/**
 * Tarjeta con efecto glow azul eléctrico
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../utils/theme';

interface GlowCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;
  active?: boolean;
}

export function GlowCard({ children, style, glowColor, active = false }: GlowCardProps) {
  return (
    <View style={[
      styles.card,
      active && { borderColor: glowColor || colors.primaryBorder },
      active && shadows.glow,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
});
