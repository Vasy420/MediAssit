import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

interface DashboardData {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  today_appointments: {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    time: string;
    urgency: string;
    status: string;
    queue_position: string | null;
    queue_status: string | null;
  }[];
  total_today: number;
  queue_length: number;
  urgency_breakdown: { red: number; orange: number; yellow: number; green: number };
}

export default function DoctorDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<DashboardData>('/api/doctor-dashboard/dashboard');
        setData(res.data as unknown as DashboardData);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Welcome, Dr. {user?.name ?? ''}</Text>
      {data && (
        <>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statNum}>{data.total_today}</Text>
              <Text style={styles.statLabel}>Today's Appointments</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statNum}>{data.queue_length}</Text>
              <Text style={styles.statLabel}>In Queue</Text>
            </Card>
          </View>

          <Card style={styles.urgencyRow}>
            <Text style={styles.sectionTitle}>Urgency Breakdown</Text>
            <View style={styles.urgencyBar}>
              {(['red', 'orange', 'yellow', 'green'] as const).map((level) => (
                <View key={level} style={styles.urgencyItem}>
                  <View style={[styles.urgencyDot, { backgroundColor: level === 'red' ? '#DC2626' : level === 'orange' ? '#F97316' : level === 'yellow' ? '#EAB308' : '#22C55E' }]} />
                  <Text style={styles.urgencyText}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}: {data.urgency_breakdown[level]}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          {data.today_appointments.length === 0 ? (
            <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
          ) : (
            data.today_appointments.map((appt) => (
              <Pressable
                key={appt.appointment_id}
                style={({ pressed }) => [styles.apptCard, pressed && styles.pressed]}
                onPress={() => router.push(`/queue/${appt.appointment_id}`)}
              >
                <View style={styles.apptHeader}>
                  <Text style={styles.apptPatient}>{appt.patient_name}</Text>
                  <StatusBadge label={appt.urgency} tone={appt.urgency === 'red' ? 'danger' : appt.urgency === 'orange' || appt.urgency === 'yellow' ? 'warning' : 'success'} />
                </View>
                <Text style={styles.apptTime}>Time: {appt.time}</Text>
                <Text style={styles.apptStatus}>Status: {appt.status.replace(/_/g, ' ')}</Text>
                {appt.queue_position && (
                  <Text style={styles.apptQueue}>Queue: {appt.queue_position} ({appt.queue_status})</Text>
                )}
              </Pressable>
            ))
          )}

          <Button title="Manage Queue" style={styles.manageQueueBtn} onPress={() => router.push('/queue')} />
        </>
      )}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  greeting: { ...typography.title, color: colors.ink, marginBottom: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, padding: spacing.lg, alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: '800', color: colors.primary },
  statLabel: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs, textAlign: 'center' },
  urgencyRow: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  urgencyBar: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  urgencyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  urgencyDot: { width: 10, height: 10, borderRadius: 5 },
  urgencyText: { ...typography.caption, color: colors.inkMuted },
  apptCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  apptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  apptPatient: { ...typography.heading, color: colors.ink },
  apptTime: { ...typography.body, color: colors.inkMuted },
  apptStatus: { ...typography.body, color: colors.inkMuted },
  apptQueue: { ...typography.caption, color: colors.primary, fontWeight: '600', marginTop: spacing.xs },
  emptyText: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.xl },
  manageQueueBtn: { marginTop: spacing.md },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
