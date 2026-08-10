import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';

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

  if (loading) return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Welcome, Dr. {user?.name ?? ''}</Text>
      {data && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{data.total_today}</Text>
              <Text style={styles.statLabel}>Today's Appointments</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{data.queue_length}</Text>
              <Text style={styles.statLabel}>In Queue</Text>
            </View>
          </View>

          <View style={styles.urgencyRow}>
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
          </View>

          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          {data.today_appointments.length === 0 ? (
            <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
          ) : (
            data.today_appointments.map((appt) => (
              <TouchableOpacity
                key={appt.appointment_id}
                style={styles.apptCard}
                onPress={() => router.push(`/queue/${appt.appointment_id}`)}
              >
                <View style={styles.apptHeader}>
                  <Text style={styles.apptPatient}>{appt.patient_name}</Text>
                  <Text style={[styles.urgencyBadge, {
                    color: appt.urgency === 'red' ? '#DC2626' : appt.urgency === 'orange' ? '#F97316' : appt.urgency === 'yellow' ? '#EAB308' : '#22C55E',
                  }]}>
                    {appt.urgency.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.apptTime}>Time: {appt.time}</Text>
                <Text style={styles.apptStatus}>Status: {appt.status.replace(/_/g, ' ')}</Text>
                {appt.queue_position && (
                  <Text style={styles.apptQueue}>Queue: {appt.queue_position} ({appt.queue_status})</Text>
                )}
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.manageQueueBtn} onPress={() => router.push('/queue')}>
            <Text style={styles.manageQueueBtnText}>Manage Queue</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: '800', color: '#2563EB' },
  statLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },
  urgencyRow: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 12 },
  urgencyBar: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  urgencyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgencyDot: { width: 10, height: 10, borderRadius: 5 },
  urgencyText: { fontSize: 13, color: '#475569' },
  apptCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  apptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  apptPatient: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  urgencyBadge: { fontSize: 12, fontWeight: '700' },
  apptTime: { fontSize: 14, color: '#475569' },
  apptStatus: { fontSize: 14, color: '#64748B' },
  apptQueue: { fontSize: 13, color: '#2563EB', fontWeight: '500', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 20 },
  manageQueueBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  manageQueueBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
