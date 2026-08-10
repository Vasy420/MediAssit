import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../contexts/SettingsContext';
import { layout, radii, shadowsStrong, spacing, typography, type ThemeColors } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  themeOverride?: ThemeColors;
  haptic?: boolean;
  onPress?: PressableProps['onPress'];
}

export function Button({ title, variant = 'primary', loading = false, disabled, style, textStyle, themeOverride, haptic = true, onPress, ...props }: ButtonProps) {
  const { theme: settingsTheme } = useSettings();
  const theme = themeOverride ?? settingsTheme;
  const isDisabled = disabled || loading;
  const variantStyle = {
    primary: { backgroundColor: theme.primary, borderColor: theme.primary },
    secondary: { backgroundColor: theme.surface, borderColor: theme.borderStrong },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
    danger: { backgroundColor: theme.dangerSoft, borderColor: theme.dangerSoft },
    success: { backgroundColor: theme.success, borderColor: theme.success },
  }[variant];
  const variantTextColor = {
    primary: theme.onPrimary,
    secondary: theme.primaryDark,
    ghost: theme.primary,
    danger: theme.danger,
    success: theme.onSuccess,
  }[variant];

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      if (haptic && !isDisabled) void Haptics.selectionAsync();
      onPress?.(event);
    },
    [haptic, isDisabled, onPress],
  );

  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: `${theme.primary}22` }}
      {...props}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        variant === 'primary' && shadowsStrong,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.onPrimary : variant === 'success' ? theme.onSuccess : variant === 'danger' ? theme.danger : theme.primary} />
      ) : (
        <Text style={[styles.text, { color: variantTextColor }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouchTarget,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: { ...typography.label, fontSize: 15 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
});
