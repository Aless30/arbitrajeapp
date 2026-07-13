/**
 * Badge de estado con colores semánticos
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../utils/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'primary' | 'muted';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.successGlow, text: colors.success },
  warning: { bg: colors.warningGlow, text: colors.warning },
  danger: { bg: colors.dangerGlow, text: colors.danger },
  primary: { bg: colors.primaryGlow, text: colors.primary },
  muted: { bg: 'rgba(136,136,170,0.1)', text: colors.textSecondary },
};

export function StatusBadge({ label, variant = 'primary' }: StatusBadgeProps) {
  const c = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>  
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
