import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

const DESKTOP_BREAKPOINT = 768;
const COLUMN_WIDTH = 430;

/**
 * On a wide web window, keep the existing phone layout in a centered column.
 * Native builds and narrow windows render the children unchanged.
 */
export function DesktopFrame({
  children,
  background,
  canvas,
}: {
  children: ReactNode;
  background: string;
  canvas: string;
}) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < DESKTOP_BREAKPOINT) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.stage, { backgroundColor: canvas }]}>
      <View style={[styles.column, { backgroundColor: background }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  column: {
    width: COLUMN_WIDTH,
    maxWidth: '100%',
    height: '100%',
    flex: 1,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(14, 42, 61, 0.08)',
    shadowColor: '#0E2A3D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
  },
});
