export const lightColors = {
  primary: '#2ECC71',
  primaryDark: '#27AE60',
  accent: '#3498DB',
  accentLight: '#EBF5FB',
  background: '#F8FAF9',
  text: '#1A2B2A',
  textSecondary: '#4A5F5E',
  muted: '#7F8C8D',
  success: '#27AE60',
  successLight: '#D5F5E3',
  warning: '#F39C12',
  warningLight: '#FEF9E7',
  error: '#E74C3C',
  errorLight: '#FDEDEC',
  white: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E8EDEC',
  shadow: '#00000012',
  gradientStart: '#2ECC71',
  gradientEnd: '#27AE60',
  iosGroupedBg: '#F2F2F7',
  inputBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.45)',
};

export const darkColors: Colors = {
  primary: '#2ECC71',
  primaryDark: '#27AE60',
  accent: '#5DADE2',
  accentLight: '#1B2838',
  background: '#1C1C1E',
  text: '#F5F5F7',
  textSecondary: '#A1A1A6',
  muted: '#8E8E93',
  success: '#30D158',
  successLight: '#1A3A2A',
  warning: '#FFD60A',
  warningLight: '#3A3000',
  error: '#FF453A',
  errorLight: '#3A1A1A',
  white: '#FFFFFF',
  card: '#2C2C2E',
  cardBorder: '#3A3A3C',
  shadow: '#00000030',
  gradientStart: '#2ECC71',
  gradientEnd: '#27AE60',
  iosGroupedBg: '#000000',
  inputBg: '#3A3A3C',
  tabBarBg: '#1C1C1E',
  overlay: 'rgba(0,0,0,0.7)',
};

export type Colors = typeof lightColors;

/** @deprecated — bileşenlerde useColors() hook'unu kullan */
export const colors = lightColors;

export const ui = {
  spacingXs: 6,
  spacingSm: 10,
  spacingMd: 14,
  spacingLg: 18,
  spacingXl: 24,
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 18,
  radiusXl: 22,
  screenPadding: 16,
  cardPadding: 14,
  buttonHeight: 52,
  borderWidth: 1,
  hairlineWidth: 0.5,
  iconSm: 14,
  iconMd: 18,
  iconLg: 24,
  titleLg: 22,
  titleMd: 18,
  textMd: 15,
  textSm: 13,
} as const;

export const headerTitle = {
  fontSize: 18,
  fontWeight: '700' as const,
  color: '#FFFFFF'
};
