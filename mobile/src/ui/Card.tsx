import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSettings } from '../contexts/SettingsContext';
import { radii, spacing, shadows } from './theme';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Card({ style, padded = true, children, ...props }: CardProps) {
  const { theme, themeName } = useSettings();
  return (
    <BlurView
      {...props}
      intensity={themeName === 'midnight' ? 30 : 18}
      tint={themeName === 'midnight' ? 'dark' : 'light'}
      style={[styles.card, { borderColor: theme.border }, style]}
    >
      <View style={[styles.glassOverlay, { backgroundColor: `${theme.surface}E6` }, padded && styles.padded]}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows,
  },
  glassOverlay: { flex: 1 },
  padded: { padding: spacing.lg },
});
