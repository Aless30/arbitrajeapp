/**
 * TEMA: Minimalista Negro + Azul Eléctrico
 * ==========================================
 */

export const colors = {
  // Fondos
  background: '#0A0A0F',
  surface: '#12121A',
  surfaceLight: '#1A1A25',
  surfaceElevated: '#1E1E2A',
  card: '#141420',

  // Azul eléctrico (acento principal)
  primary: '#0066FF',
  primaryLight: '#3388FF',
  primaryDark: '#0044CC',
  primaryGlow: 'rgba(0, 102, 255, 0.15)',
  primaryBorder: 'rgba(0, 102, 255, 0.3)',

  // Textos
  textPrimary: '#FFFFFF',
  textSecondary: '#8888AA',
  textMuted: '#555566',
  textAccent: '#0066FF',

  // Estados
  success: '#00CC88',
  successGlow: 'rgba(0, 204, 136, 0.15)',
  warning: '#FFAA00',
  warningGlow: 'rgba(255, 170, 0, 0.15)',
  danger: '#FF3366',
  dangerGlow: 'rgba(255, 51, 102, 0.15)',

  // Bordes
  border: '#222233',
  borderLight: '#2A2A3A',

  // Gradientes
  gradientStart: '#0066FF',
  gradientEnd: '#0044AA',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
  display: 36,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
