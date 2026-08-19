import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, shadowsStrong, spacing, typography } from '../../src/ui/theme';

interface DashboardStats {
  upcoming_appts: number;
  queue_position: number | null;
  report_count: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { theme } = useSettings();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ upcoming_appts: 0, queue_position: null, report_count: 0 });

  const loadStats = useCallback(async () => {
    try {
      const patientRes = await api.get<{ patient: { patient_id: string } }>('/api/patients/me');
      const patientId = patientRes.data?.patient?.patient_id;
      const [apptsRes, queueRes, reportsRes] = await Promise.allSettled([
        api.get<unknown[]>('/api/appointments'),
        api.get<{ entries?: { position?: number }[] }>('/api/queue/active'),
        patientId ? api.get<unknown[]>(`/api/reports/patient/${patientId}`) : Promise.resolve({ data: [] }),
      ]);
      const appointments = apptsRes.status === 'fulfilled' && Array.isArray(apptsRes.value.data) ? apptsRes.value.data : [];
      const upcoming = appointments.filter((a) => ['scheduled', 'confirmed', 'in_queue'].includes(String((a as { status?: string }).status))).length;
      const queueData = queueRes.status === 'fulfilled' ? (queueRes.value as { entries?: { position?: number }[] }).entries ?? [] : [];
      const reports = reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value.data) ? reportsRes.value.data : [];
      setStats({ upcoming_appts: upcoming, queue_position: queueData[0]?.position ?? null, report_count: reports.length });
    } catch {
      // Offline — keep previous stats
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadStats(); }, [loadStats]));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>{greeting}, {user?.name?.split(' ')[0] || 'Patient'}</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="calendar" size={16} color={colors.primary} /></View>
          <Text style={styles.statNumber}>{stats.upcoming_appts}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </Card>
        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.warningSoft }]}><Ionicons name="time" size={16} color={colors.warning} /></View>
          <Text style={styles.statNumber}>{stats.queue_position ?? '—'}</Text>
          <Text style={styles.statLabel}>Queue Pos.</Text>
        </Card>
        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name="document-text" size={16} color={colors.accent} /></View>
          <Text style={styles.statNumber}>{stats.report_count}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <Pressable style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.primary }, pressed && styles.pressed]} onPress={() => router.push('/(tabs)/ai-chat')}>
        <View style={styles.actionIconWrap}><Ionicons name="sparkles" size={22} color={colors.white} /></View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>AI Symptom Checker</Text>
          <Text style={styles.actionDesc}>Describe symptoms, get instant triage guidance</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.accent }, pressed && styles.pressed]} onPress={() => router.push('/(tabs)/doctors')}>
        <View style={styles.actionIconWrap}><Ionicons name="medical" size={22} color={colors.white} /></View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Find a Doctor</Text>
          <Text style={styles.actionDesc}>Browse specialists and book an appointment</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.actionCard, { backgroundColor: theme.primaryDark }, pressed && styles.pressed]} onPress={() => router.push('/(tabs)/appointments')}>
        <View style={styles.actionIconWrap}><Ionicons name="calendar" size={22} color={colors.white} /></View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>My Appointments</Text>
          <Text style={styles.actionDesc}>Track bookings, queue, and pre-consultation</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.success }, pressed && styles.pressed]} onPress={() => router.push('/reports/scan')}>
        <View style={styles.actionIconWrap}><Ionicons name="scan" size={22} color={colors.white} /></View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Scan a Paper Report</Text>
          <Text style={styles.actionDesc}>Snap a photo, get text + AI plain-language summary</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>

      <Pressable style={({ pressed }) => [styles.actionCard, { backgroundColor: '#5F51A5' }, pressed && styles.pressed]} onPress={() => router.push('/timeline')}>
        <View style={styles.actionIconWrap}><Ionicons name="time" size={22} color={colors.white} /></View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>Health Timeline</Text>
          <Text style={styles.actionDesc}>Every visit, report, and prescription in one place</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  greeting: { marginBottom: spacing.xl, marginTop: spacing.sm },
  greetingText: { ...typography.display, fontSize: 26, lineHeight: 32, color: colors.ink },
  dateText: { ...typography.body, color: colors.inkMuted, marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxxl },
  statCard: { flex: 1, alignItems: 'flex-start' },
  statIcon: { width: 30, height: 30, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statNumber: { fontSize: 26, fontWeight: '800', color: colors.ink },
  statLabel: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  actionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadowsStrong },
  actionIconWrap: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, marginHorizontal: spacing.md },
  actionTitle: { ...typography.heading, color: colors.white },
  actionDesc: { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
