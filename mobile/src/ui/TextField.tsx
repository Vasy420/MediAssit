import { StyleSheet, Text, TextInput, type TextInputProps, type StyleProp, type ViewStyle, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { layout, radii, spacing, typography } from './theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rightAccessory?: ReactNode;
}

export function TextField({ label, containerStyle, rightAccessory, ...props }: TextFieldProps) {
  const { theme } = useSettings();
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, { color: theme.inkMuted }]}>{label}</Text> : null}
      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
        <TextInput
          {...props}
          placeholderTextColor={props.placeholderTextColor ?? theme.inkSubtle}
          style={[styles.input, { color: theme.ink }, props.style]}
        />
        {rightAccessory}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm },
  inputRow: {
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
});
