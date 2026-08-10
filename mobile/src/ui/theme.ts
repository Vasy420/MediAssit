import { Platform } from 'react-native';

export const colors = {
  background: '#F4F8FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF4F7',
  primary: '#14658C',
  primaryDark: '#0D4A66',
  primarySoft: '#DDF0F8',
  accent: '#1F8A7A',
  accentSoft: '#DCF3EC',
  ink: '#0E2A3D',
  inkMuted: '#4E6476',
  inkSubtle: '#8398A8',
  border: '#DDE8EF',
  borderStrong: '#C3D5E0',
  success: '#147A55',
  successSoft: '#DBF3E6',
  warning: '#A96B0A',
  warningSoft: '#FCEFCF',
  danger: '#B32633',
  dangerSoft: '#FBE3E5',
  onPrimary: '#FFFFFF',
  onSuccess: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ThemeColors = { [Key in keyof typeof colors]: string };
export type ThemeName = 'ocean' | 'sage' | 'lavender' | 'midnight';

export const themes: Record<ThemeName, ThemeColors> = {
  ocean: colors,
  sage: {
    ...colors,
    background: '#F3F9F5',
    surfaceMuted: '#E9F4EC',
    primary: '#2C7459',
    primaryDark: '#1E5440',
    primarySoft: '#DDF1E5',
    accent: '#5A9468',
    accentSoft: '#E2F1E4',
    border: '#D5E6DA',
    borderStrong: '#B7D3C1',
    ink: '#173329',
    inkMuted: '#567060',
  },
  lavender: {
    ...colors,
    background: '#F7F6FC',
    surfaceMuted: '#EFEDF9',
    primary: '#5F51A5',
    primaryDark: '#463B85',
    primarySoft: '#E9E5FA',
    accent: '#8470BE',
    accentSoft: '#EDE7FA',
    border: '#E1DCF0',
    borderStrong: '#C9BFE3',
    ink: '#252041',
    inkMuted: '#67607F',
  },
  midnight: {
    ...colors,
    background: '#0B1622',
    surface: '#152536',
    surfaceMuted: '#1D3245',
    primary: '#6FD0DC',
    primaryDark: '#A9EDF1',
    primarySoft: '#1D4654',
    accent: '#6FCF9C',
    accentSoft: '#1D4A38',
    ink: '#F2F8FB',
    inkMuted: '#BCCDD9',
    inkSubtle: '#89A0B2',
    border: '#294256',
    borderStrong: '#40607A',
    success: '#6FCF9C',
    successSoft: '#1D4A38',
    warning: '#EFC870',
    warningSoft: '#4E3F20',
    danger: '#F7969E',
    dangerSoft: '#4F2932',
    onPrimary: '#06222C',
    onSuccess: '#06251B',
    white: '#FFFFFF',
  },
};

export const roleThemes: Record<'patient' | 'doctor', ThemeColors> = {
  patient: themes.sage,
  doctor: themes.ocean,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
} as const;

export const shadows = Platform.select({
  ios: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  default: {},
});

export const shadowsStrong = Platform.select({
  ios: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  android: { elevation: 5 },
  default: {},
});

export const layout = {
  horizontalPadding: spacing.xl,
  minTouchTarget: 48,
};
