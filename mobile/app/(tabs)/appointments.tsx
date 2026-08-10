import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { Appointment } from '../../src/types';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#16A34A',
  cancelled: '#DC2626',
  completed: '#6B7280',
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAppointments = useCallback(async () => {
    try {
      const res = await api.get<{ appointments: Appointment[] }>('/api/appointments?limit=20');
      setAppointments(((res.data as { appointments: Appointment[] })?.appointments) ?? []);
    } catch {
      // Offline — use cached/empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const handleCancel = async (appt: Appointment) => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/appointments/${appt.appointment_id}/cancel`);
            setAppointments((prev) =>
              prev.map((a) => (a.appointment_id === appt.appointment_id ? { ...a, status: 'cancelled' } : a)),
            );
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  };

  const handleJoinQueue = async (appt: Appointment) => {
    try {
      const res = await api.post<{ queue_id: string }>('/api/queue/join', { appointment_id: appt.appointment_id });
      const queueId = ((res.data as { queue_id?: string })?.queue_id);
      if (queueId) {
        router.push(`/queue/${queueId}`);
      }
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />;
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item) => item.appointment_id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppointments(); }} />}
      renderItem={({ item: appt }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.date}>{new Date(appt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            <Text style={styles.time}>{appt.time}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[appt.status] || '#6B7280' }]}>
              <Text style={styles.statusText}>{appt.status.toUpperCase()}</Text>
            </View>
          </View>
          {appt.reason && <Text style={styles.reason}>Reason: {appt.reason}</Text>}
          {appt.urgency && (
            <Text style={[styles.urgency, { color: appt.urgency === 'red' ? '#DC2626' : '#F59E0B' }]}>
              Urgency: {appt.urgency.toUpperCase()}
            </Text>
          )}
          {appt.status === 'confirmed' && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.preconsultBtn} onPress={() => router.push(`/preconsult/${appt.appointment_id}`)}>
                <Text style={styles.preconsultBtnText}>Pre-Consult</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoinQueue(appt)}>
                <Text style={styles.joinBtnText}>Join Queue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(appt)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyView}>
          <Text style={styles.emptyText}>No appointments yet.</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/doctors')}>
            <Text style={styles.emptyLink}>Find a Doctor</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1 },
  time: { fontSize: 15, color: '#2563EB', fontWeight: '600', marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  reason: { fontSize: 14, color: '#475569', marginBottom: 4 },
  urgency: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  preconsultBtn: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 90 },
  preconsultBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  joinBtn: { flex: 1, backgroundColor: '#16A34A', borderRadius: 8, padding: 10, alignItems: 'center' },
  joinBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, alignItems: 'center' },
  cancelBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
  emptyView: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#94A3B8', marginBottom: 12 },
  emptyLink: { fontSize: 16, color: '#2563EB', fontWeight: '600' },
});
