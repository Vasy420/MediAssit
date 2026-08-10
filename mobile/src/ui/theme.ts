import { Platform } from 'react-native';

export const colors = {
  background: '#F5F9FC',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF5F8',
  primary: '#176B87',
  primaryDark: '#0F526B',
  primarySoft: '#DDF2F7',
  accent: '#2C8A84',
  accentSoft: '#DDF5EF',
  ink: '#102A43',
  inkMuted: '#52677A',
  inkSubtle: '#8293A3',
  border: '#DCE8EE',
  borderStrong: '#C5D8E1',
  success: '#16805B',
  successSoft: '#DDF5E9',
  warning: '#B56A08',
  warningSoft: '#FFF0D2',
  danger: '#B4232C',
  dangerSoft: '#FDE4E5',
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
    background: '#F4FAF7', surfaceMuted: '#EAF5EF', primary: '#2D7962', primaryDark: '#205B4A', primarySoft: '#DDF2E8', accent: '#5D9B72', accentSoft: '#E4F2E6', border: '#D6E8DD', borderStrong: '#BBD8C6', ink: '#17352B', inkMuted: '#5A7569',
  },
  lavender: {
    ...colors,
    background: '#F8F7FC', surfaceMuted: '#F0EEF9', primary: '#6658A7', primaryDark: '#4E4387', primarySoft: '#EAE6FA', accent: '#8A72C0', accentSoft: '#EEE8FA', border: '#E2DDF1', borderStrong: '#CEC5E5', ink: '#272240', inkMuted: '#6D6684',
  },
  midnight: {
    ...colors,
    background: '#0B1726', surface: '#16283B', surfaceMuted: '#20384B', primary: '#74D6DB', primaryDark: '#B8F0EC', primarySoft: '#214A59', accent: '#7BD19E', accentSoft: '#20503F', ink: '#F4FAFC', inkMuted: '#C0D0DC', inkSubtle: '#8EA5B7', border: '#2D475D', borderStrong: '#46647A', success: '#7BD19E', successSoft: '#20503F', warning: '#F3CB79', warningSoft: '#554522', danger: '#FF9FA5', dangerSoft: '#552D38', onPrimary: '#09232D', onSuccess: '#09291D', white: '#FFFFFF',
  },
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
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
} as const;

export const shadows = Platform.select({
  ios: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
  default: {},
});

export const layout = {
  horizontalPadding: spacing.xl,
  minTouchTarget: 48,
} as const;
