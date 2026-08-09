import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { QueueEntry } from '../../src/types';

export default function QueueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadEntry() {
    try {
      const res = await api.get<{ entry: QueueEntry }>(`/api/queue/${id}`);
      setEntry(((res.data as { entry: QueueEntry })?.entry) ?? null);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadEntry().finally(() => setLoading(false));
    timerRef.current = setInterval(loadEntry, 15000);
    return () => clearInterval(timerRef.current);
  }, [id]);

  const handleCancel = async () => {
    Alert.alert('Leave Queue', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/queue/${id}/cancel`);
            setEntry((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />;
  if (!entry) return <Text style={styles.error}>Queue entry not found.</Text>;

  const isActive = entry.status === 'waiting';
  const isDone = entry.status === 'cancelled' || entry.status === 'completed';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.positionCircle}>
          <Text style={styles.positionNum}>{entry.position}</Text>
          <Text style={styles.positionLabel}>
            {entry.status === 'called' ? 'NOW' : 'POSITION'}
          </Text>
        </View>
        <Text style={styles.status}>
          {entry.status === 'waiting' ? 'In Queue'
            : entry.status === 'called' ? 'Doctor Calling!'
            : entry.status === 'in_consultation' ? 'In Consultation'
            : entry.status === 'completed' ? 'Completed'
            : 'Cancelled'}
        </Text>
        {isActive && (
          <Text style={styles.waitText}>
            Estimated wait: ~{entry.estimated_wait_minutes} minutes
          </Text>
        )}
      </View>

      {isActive && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Leave Queue</Text>
        </TouchableOpacity>
      )}

      {isDone && (
        <Text style={styles.doneText}>
          {entry.status === 'cancelled' ? 'You have left the queue.' : 'Your consultation is complete.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  card: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  positionCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  positionNum: { fontSize: 36, fontWeight: '800', color: '#2563EB' },
  positionLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  status: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  waitText: { fontSize: 14, color: '#64748B' },
  cancelBtn: { width: '100%', backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16, alignItems: 'center' },
  cancelBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 16 },
  doneText: { fontSize: 15, color: '#475569', textAlign: 'center', marginTop: 20 },
  error: { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 16 },
});
