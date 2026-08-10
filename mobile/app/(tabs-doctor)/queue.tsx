import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';

interface QueueEntry {
  queue_id: string;
  patient_id: string;
  patient?: { name: string; age?: number };
  appointment_time?: string;
  position: number;
  priority_score: number;
  urgency: string;
  status: string;
  waiting_time: number;
}

export default function DoctorQueueScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    if (!doctorId) return;
    try {
      const res = await api.get<{ data: QueueEntry[] }>(`/api/queue/doctor/${doctorId}`);
      setEntries(((res.data as { data?: QueueEntry[] })?.data) ?? []);
    } catch {
      // ignore
    }
  }, [doctorId]);

  useEffect(() => {
    async function getDoctor() {
      try {
        const me = await api.get<{ patient_id?: string; doctor_id?: string }>('/api/auth/me');
        const docId = (me.data as { doctor_id?: string })?.doctor_id;
        if (docId) setDoctorId(docId);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    getDoctor();
  }, []);

  useEffect(() => {
    if (doctorId) {
      loadQueue();
      const interval = setInterval(loadQueue, 10000);
      return () => clearInterval(interval);
    }
  }, [doctorId, loadQueue]);

  const handleCallNext = async () => {
    const next = entries.find((e) => e.status === 'waiting');
    if (!next) {
      Alert.alert('No Patients', 'No patients are waiting in the queue.');
      return;
    }
    try {
      await api.patch(`/api/queue/${next.queue_id}`, { status: 'called' });
      loadQueue();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const handleComplete = async (queueId: string) => {
    try {
      await api.patch(`/api/queue/${queueId}`, { status: 'completed' });
      loadQueue();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const handleStartConsultation = async (queueId: string) => {
    try {
      await api.patch(`/api/queue/${queueId}`, { status: 'in_consultation' });
      loadQueue();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />;

  const waiting = entries.filter((e) => e.status === 'waiting');
  const active = entries.filter((e) => e.status === 'called' || e.status === 'in_consultation');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Queue ({entries.length})</Text>
        {waiting.length > 0 && (
          <TouchableOpacity style={styles.callNextBtn} onPress={handleCallNext}>
            <Text style={styles.callNextBtnText}>Call Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {active.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active</Text>
          {active.map((entry) => (
            <View key={entry.queue_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{entry.patient?.name ?? entry.patient_id}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {entry.status === 'called' ? 'CALLED' : 'IN CONSULTATION'}
                  </Text>
                </View>
              </View>
              <Text style={styles.detail}>Position: #{entry.position}</Text>
              <Text style={styles.detail}>Urgency: {entry.urgency.toUpperCase()}</Text>
              {entry.appointment_time && <Text style={styles.detail}>Appointment: {entry.appointment_time}</Text>}
              <View style={styles.actionRow}>
                {entry.status === 'called' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleStartConsultation(entry.queue_id)}>
                    <Text style={styles.actionBtnText}>Start Consultation</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(entry.queue_id)}>
                  <Text style={styles.completeBtnText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Waiting ({waiting.length})</Text>
        {waiting.length === 0 ? (
          <Text style={styles.emptyText}>No patients waiting.</Text>
        ) : (
          waiting.map((entry, i) => (
            <View key={entry.queue_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{entry.patient?.name ?? entry.patient_id}</Text>
                <Text style={[styles.urgencyBadge, {
                  color: entry.urgency === 'red' ? '#DC2626' : entry.urgency === 'orange' ? '#F97316' : entry.urgency === 'yellow' ? '#EAB308' : '#22C55E',
                }]}>
                  {entry.urgency.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.detail}>Position: #{entry.position}</Text>
              <Text style={styles.detail}>Est. wait: ~{entry.waiting_time} min</Text>
              {entry.appointment_time && <Text style={styles.detail}>Appointment: {entry.appointment_time}</Text>}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  callNextBtn: { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  callNextBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  patientName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  statusBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  urgencyBadge: { fontSize: 12, fontWeight: '700' },
  detail: { fontSize: 14, color: '#64748B', marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, backgroundColor: '#2563EB', borderRadius: 8, padding: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  completeBtn: { flex: 1, backgroundColor: '#22C55E', borderRadius: 8, padding: 10, alignItems: 'center' },
  completeBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 10 },
});
