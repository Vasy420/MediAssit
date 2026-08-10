import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

interface DashboardStats {
  upcoming_appts: number;
  queue_position: number | null;
  report_count: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ upcoming_appts: 0, queue_position: null, report_count: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        const [apptsRes, queueRes, reportsRes] = await Promise.allSettled([
          api.get<{ appointments: unknown[] }>('/api/appointments?limit=5&status=pending,confirmed'),
          api.get<{ entries: unknown[] }>('/api/queue/active'),
          api.get<{ reports: unknown[] }>('/api/reports?limit=5'),
        ]);
        setStats({
          upcoming_appts: (apptsRes.status === 'fulfilled' ? ((apptsRes.value.data as { appointments?: unknown[] })?.appointments?.length ?? 0) : 0),
          queue_position: queueRes.status === 'fulfilled' ? (((queueRes.value.data as { entries?: unknown[] })?.entries?.[0] as { position?: number } | undefined)?.position ?? null) : null,
          report_count: reportsRes.status === 'fulfilled' ? ((reportsRes.value.data as { reports?: unknown[] })?.reports?.length ?? 0) : 0,
        });
      } catch {
        // Offline — show zeros
      }
    }
    loadStats();
  }, []);

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Hello, {user?.name?.split(' ')[0] || 'Patient'}</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.upcoming_appts}</Text>
          <Text style={styles.statLabel}>Upcoming{'\n'}Appointments</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.queue_position ?? '—'}</Text>
          <Text style={styles.statLabel}>Queue{'\n'}Position</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.report_count}</Text>
          <Text style={styles.statLabel}>Medical{'\n'}Reports</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]} onPress={() => router.push('/(tabs)/ai-chat')}>
        <Text style={styles.actionTitle}>AI Symptom Checker</Text>
        <Text style={styles.actionDesc}>Describe your symptoms and get instant triage guidance</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.actionCardAlt, pressed && styles.pressed]} onPress={() => router.push('/(tabs)/doctors')}>
        <Text style={styles.actionTitle}>Find a Doctor</Text>
        <Text style={styles.actionDesc}>Browse specialists and book an appointment</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]} onPress={() => router.push('/(tabs)/appointments')}>
        <Text style={styles.actionTitle}>My Appointments</Text>
        <Text style={styles.actionDesc}>View upcoming and past appointments</Text>
      </Pressable>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  greeting: { marginBottom: spacing.xl, marginTop: spacing.sm },
  greetingText: { ...typography.title, color: colors.ink },
  dateText: { ...typography.body, color: colors.inkMuted, marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxxl },
  statCard: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statNumber: { fontSize: 27, fontWeight: '800', color: colors.primary },
  statLabel: { ...typography.caption, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  actionCard: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.xl, marginBottom: spacing.md },
  actionCardAlt: { backgroundColor: colors.accent, borderRadius: 16, padding: spacing.xl, marginBottom: spacing.md },
  actionTitle: { ...typography.heading, color: colors.white },
  actionDesc: { ...typography.body, color: '#E9F7F8', marginTop: spacing.xs },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
