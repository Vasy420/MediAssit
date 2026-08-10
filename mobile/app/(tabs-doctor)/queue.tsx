import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

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
        const me = await api.get<{ doctor?: { doctor_id?: string } }>('/api/doctors/me');
        const docId = (me.data as { doctor?: { doctor_id?: string } })?.doctor?.doctor_id;
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

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  const waiting = entries.filter((e) => e.status === 'waiting');
  const active = entries.filter((e) => e.status === 'called' || e.status === 'in_consultation');

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Queue ({entries.length})</Text>
        {waiting.length > 0 && (
          <Button title="Call Next" variant="success" style={styles.callNextBtn} onPress={handleCallNext} />
        )}
      </View>

      {active.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active</Text>
          {active.map((entry) => (
            <Card key={entry.queue_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{entry.patient?.name ?? entry.patient_id}</Text>
                <StatusBadge label={entry.status === 'called' ? 'Called' : 'In Consultation'} tone="warning" />
              </View>
              <Text style={styles.detail}>Position: #{entry.position}</Text>
              <Text style={styles.detail}>Urgency: {entry.urgency.toUpperCase()}</Text>
              {entry.appointment_time && <Text style={styles.detail}>Appointment: {entry.appointment_time}</Text>}
              <View style={styles.actionRow}>
                {entry.status === 'called' && (
                  <Button title="Start Consultation" style={styles.actionBtn} onPress={() => handleStartConsultation(entry.queue_id)} />
                )}
                <Button title="Complete" variant="success" style={styles.completeBtn} onPress={() => handleComplete(entry.queue_id)} />
              </View>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Waiting ({waiting.length})</Text>
        {waiting.length === 0 ? (
          <Text style={styles.emptyText}>No patients waiting.</Text>
        ) : (
          waiting.map((entry, i) => (
            <Card key={entry.queue_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{entry.patient?.name ?? entry.patient_id}</Text>
                <StatusBadge label={entry.urgency} tone={entry.urgency === 'red' ? 'danger' : entry.urgency === 'orange' || entry.urgency === 'yellow' ? 'warning' : 'success'} />
              </View>
              <Text style={styles.detail}>Position: #{entry.position}</Text>
              <Text style={styles.detail}>Est. wait: ~{entry.waiting_time} min</Text>
              {entry.appointment_time && <Text style={styles.detail}>Appointment: {entry.appointment_time}</Text>}
            </Card>
          ))
        )}
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.title, color: colors.ink },
  callNextBtn: { minWidth: 112 },
  section: { marginBottom: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.inkMuted, marginBottom: spacing.md },
  card: { marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  patientName: { ...typography.heading, color: colors.ink },
  detail: { ...typography.body, color: colors.inkMuted, marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1 },
  completeBtn: { flex: 1 },
  emptyText: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.sm },
});
