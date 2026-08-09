import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Hello, {user?.name?.split(' ')[0] || 'Patient'}</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.upcoming_appts}</Text>
          <Text style={styles.statLabel}>Upcoming{'\n'}Appointments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.queue_position ?? '—'}</Text>
          <Text style={styles.statLabel}>Queue{'\n'}Position</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.report_count}</Text>
          <Text style={styles.statLabel}>Medical{'\n'}Reports</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/ai-chat')}>
        <Text style={styles.actionTitle}>AI Symptom Checker</Text>
        <Text style={styles.actionDesc}>Describe your symptoms and get instant triage guidance</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCardAlt} onPress={() => router.push('/(tabs)/doctors')}>
        <Text style={styles.actionTitle}>Find a Doctor</Text>
        <Text style={styles.actionDesc}>Browse specialists and book an appointment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/appointments')}>
        <Text style={styles.actionTitle}>My Appointments</Text>
        <Text style={styles.actionDesc}>View upcoming and past appointments</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { marginBottom: 20, marginTop: 8 },
  greetingText: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  dateText: { fontSize: 14, color: '#64748B', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#2563EB' },
  statLabel: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 12 },
  actionCard: { backgroundColor: '#2563EB', borderRadius: 12, padding: 18, marginBottom: 10 },
  actionCardAlt: { backgroundColor: '#0891B2', borderRadius: 12, padding: 18, marginBottom: 10 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  actionDesc: { fontSize: 13, color: '#E2E8F0', marginTop: 4 },
});
