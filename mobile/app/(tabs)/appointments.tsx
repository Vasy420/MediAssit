import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { Appointment } from '../../src/types';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

const STATUS_TONES = { pending: 'warning', scheduled: 'primary', confirmed: 'success', in_queue: 'primary', in_consultation: 'warning', cancelled: 'danger', completed: 'neutral', no_show: 'danger' } as const;

export default function AppointmentsScreen() {
  const router = useRouter();
  const { testMode, fakeAppointments, removeFakeAppointment } = useSettings();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const visibleAppointments = testMode
    ? [...fakeAppointments, ...appointments.filter((appointment) => !appointment.is_fake)]
    : appointments.filter((appointment) => !appointment.is_fake);

  const loadAppointments = useCallback(async () => {
    try {
      const res = await api.get<Appointment[]>('/api/appointments?limit=20');
      const rows = Array.isArray(res.data) ? res.data : [];
      setAppointments(rows.map((appointment) => {
        const withDoctor = appointment as Appointment & { doctor?: { name?: string } | null };
        return { ...appointment, doctor_name: appointment.doctor_name ?? withDoctor.doctor?.name };
      }));
    } catch {
      // Offline — use cached/empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadAppointments();
  }, [loadAppointments]));

  const handleCancel = async (appt: Appointment) => {
    if (appt.is_fake) {
      removeFakeAppointment(appt.appointment_id);
      Alert.alert('Fake appointment removed', 'Test appointment was removed locally.');
      return;
    }
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/appointments/${appt.appointment_id}`, { status: 'cancelled' });
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
    if (appt.is_fake) {
      router.push('/queue/FAKE-QUEUE-001');
      return;
    }
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
    return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;
  }

  return (
    <Screen padded={false}>
    <FlatList
      data={visibleAppointments}
      keyExtractor={(item) => item.appointment_id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppointments(); }} />}
      renderItem={({ item: appt }) => (
        <Card style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.date}>{new Date(appt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            <Text style={styles.time}>{appt.time}</Text>
            <StatusBadge label={appt.status} tone={STATUS_TONES[appt.status as keyof typeof STATUS_TONES] || 'neutral'} />
          </View>
          {appt.is_fake && <StatusBadge label="Fake test data" tone="warning" />}
          {appt.doctor_name && <Text style={styles.doctorName}>{appt.doctor_name}</Text>}
          {appt.hospital && <Text style={styles.hospital}>Clinic: {appt.hospital}</Text>}
          {appt.reason && <Text style={styles.reason}>Reason: {appt.reason}</Text>}
          {appt.urgency && (
            <Text style={[styles.urgency, { color: appt.urgency === 'red' ? '#DC2626' : '#F59E0B' }]}>
              Urgency: {appt.urgency.toUpperCase()}
            </Text>
          )}
          {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
            <View style={styles.actions}>
              <Button title="Pre-Consult" variant="secondary" style={styles.actionButton} onPress={() => router.push(`/preconsult/${appt.appointment_id}`)} />
              <Button title="Join Queue" variant="success" style={styles.actionButton} onPress={() => handleJoinQueue(appt)} />
              <Button title="Cancel" variant="danger" style={styles.actionButton} onPress={() => handleCancel(appt)} />
            </View>
          )}
        </Card>
      )}
      ListEmptyComponent={
        <View style={styles.emptyView}>
          <Text style={styles.emptyText}>No appointments yet.</Text>
          <Button title="Find a Doctor" variant="secondary" onPress={() => router.push('/(tabs)/doctors')} />
        </View>
      }
    />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.horizontalPadding, paddingBottom: 40 },
  card: { marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  date: { ...typography.heading, color: colors.ink, flex: 1 },
  time: { ...typography.label, color: colors.primary, marginRight: spacing.sm },
  doctorName: { ...typography.body, color: colors.primary, marginTop: spacing.sm },
  hospital: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
  reason: { ...typography.body, color: colors.inkMuted, marginBottom: spacing.xs },
  urgency: { ...typography.caption, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  actionButton: { flexGrow: 1, flexBasis: '30%', paddingHorizontal: spacing.sm },
  emptyView: { alignItems: 'center', marginTop: 60 },
  emptyText: { ...typography.body, color: colors.inkSubtle, marginBottom: spacing.md },
});
