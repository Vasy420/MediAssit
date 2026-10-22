import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../api/client';
import { useSettings } from '../contexts/SettingsContext';
import { spacing, typography } from './theme';

type Status = 'checking' | 'online' | 'offline' | 'waking';

export function ServerStatus() {
  const { theme } = useSettings();
  const [status, setStatus] = useState<Status>('checking');

  const read = useCallback(async (wake: boolean) => {
    setStatus(wake ? 'waking' : 'checking');
    try {
      const res = wake
        ? await api.post<{ ai_service?: string }>('/api/ai/wake')
        : await api.get<{ ai_service?: string }>('/api/ai/health');
      setStatus(res.data?.ai_service === 'online' ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void read(false);
  }, [read]));

  const color = status === 'online' ? theme.success : status === 'offline' ? theme.danger : theme.inkSubtle;
  const label = status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : status === 'waking' ? 'Waking' : 'Checking';

  return (
    <View style={styles.row}>
      {status === 'checking' || status === 'waking' ? (
        <ActivityIndicator size="small" color={color} style={styles.spinner} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.label, { color: theme.inkMuted }]}>{label}</Text>
      {status === 'offline' ? (
        <Pressable onPress={() => void read(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Wake server">
          <Text style={[styles.wake, { color: theme.primary }]}>Wake</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm, minHeight: 22, marginBottom: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  spinner: { transform: [{ scale: 0.7 }] },
  label: { ...typography.caption },
  wake: { ...typography.caption, fontWeight: '700' },
});
