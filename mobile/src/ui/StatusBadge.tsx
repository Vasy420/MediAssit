import { StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { radii, spacing, typography } from './theme';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const { theme } = useSettings();
  const backgroundColor = { neutral: theme.surfaceMuted, primary: theme.primarySoft, success: theme.successSoft, warning: theme.warningSoft, danger: theme.dangerSoft }[tone];
  const textColor = { neutral: theme.inkMuted, primary: theme.primaryDark, success: theme.success, warning: theme.warning, danger: theme.danger }[tone];
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  text: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
});
