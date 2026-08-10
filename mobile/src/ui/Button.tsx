import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { layout, radii, spacing, typography } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({ title, variant = 'primary', loading = false, disabled, style, textStyle, ...props }: ButtonProps) {
  const { theme } = useSettings();
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

  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: `${theme.primary}44` }}
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
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
  pressed: { opacity: 0.62, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.48 },
});
