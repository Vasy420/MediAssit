import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { QueueEntry } from '../../src/types';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, radii, spacing, typography } from '../../src/ui/theme';

export default function QueueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isFake = id.startsWith('FAKE-');
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadEntry() {
    if (isFake) {
      setEntry({ queue_id: id, patient_id: 'FAKE-PATIENT', doctor_id: 'FAKE-DOC-001', position: 3, status: 'waiting', estimated_wait_minutes: 30 });
      return;
    }
    try {
      const res = await api.get<QueueEntry>(`/api/queue/${id}`);
      setEntry((res.data as unknown as QueueEntry) ?? null);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadEntry().finally(() => setLoading(false));
    if (!isFake) timerRef.current = setInterval(loadEntry, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, isFake]);

  const handleCancel = async () => {
    Alert.alert('Leave Queue', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!isFake) await api.patch(`/api/queue/${id}/cancel`);
            await loadEntry();
            setEntry((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
            Alert.alert('Queue left', 'You have left this queue.');
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;
  if (!entry) return <Screen><Text style={styles.error}>Queue entry not found.</Text></Screen>;

  const isActive = entry.status !== 'cancelled' && entry.status !== 'completed';
  const isDone = entry.status === 'cancelled' || entry.status === 'completed';
  const statusText =
    entry.status === 'waiting' ? 'In Queue'
    : entry.status === 'called' ? 'Doctor Calling!'
    : entry.status === 'in_consultation' ? 'In Consultation'
    : entry.status === 'completed' ? 'Completed'
    : 'Cancelled';
  const ringColor =
    entry.status === 'called' ? colors.success
    : entry.status === 'in_consultation' ? colors.warning
    : isDone ? colors.inkSubtle
    : colors.primary;

  return (
    <Screen style={styles.container}>
      <Card style={styles.card}>
        <View style={[styles.positionCircle, { borderColor: ringColor, backgroundColor: colors.surface }]}>
          <Text style={[styles.positionNum, { color: ringColor }]}>{entry.position ?? '-'}</Text>
          <Text style={styles.positionLabel}>
            {entry.status === 'called' ? 'NOW' : 'POSITION'}
          </Text>
        </View>
        <Text style={styles.status}>{statusText}</Text>
        {isActive && (
          <View style={styles.waitPill}>
            <Ionicons name="time-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.waitText}>~{entry.estimated_wait_minutes ?? entry.waiting_time ?? 0} min wait</Text>
          </View>
        )}
        {(entry.appointment_time || entry.appointment?.time) && (
          <View style={styles.waitPill}>
            <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.appointmentText}>Appointment {entry.appointment_time ?? entry.appointment?.time}</Text>
          </View>
        )}
        {entry.status === 'waiting' && (
          <Text style={styles.hint}>You will be notified when the doctor calls you.</Text>
        )}
      </Card>

      {isActive && (
        <Button title="Leave Queue" variant="danger" style={styles.cancelBtn} onPress={handleCancel} />
      )}

      {isDone && (
        <Text style={styles.doneText}>
          {entry.status === 'cancelled' ? 'You have left the queue.' : 'Your consultation is complete.'}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl },
  card: { width: '100%', padding: spacing.xxxl, alignItems: 'center', marginBottom: spacing.xl },
  positionCircle: { width: 116, height: 116, borderRadius: 58, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  positionNum: { fontSize: 40, fontWeight: '800' },
  positionLabel: { ...typography.caption, color: colors.inkMuted, letterSpacing: 1 },
  status: { ...typography.heading, color: colors.ink, marginBottom: spacing.sm },
  waitPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primarySoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.xs },
  waitText: { ...typography.label, color: colors.primaryDark },
  appointmentText: { ...typography.label, color: colors.primaryDark },
  hint: { ...typography.caption, color: colors.inkSubtle, marginTop: spacing.lg, textAlign: 'center' },
  cancelBtn: { width: '100%' },
  doneText: { ...typography.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
  error: { textAlign: 'center', color: colors.inkSubtle, marginTop: 60, fontSize: 16 },
});
