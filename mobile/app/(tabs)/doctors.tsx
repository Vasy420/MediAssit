import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { Appointment, Doctor } from '../../src/types';
import { fakeDoctors } from '../../src/data/testData';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { TextField } from '../../src/ui/TextField';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

interface BackendDoctor {
  doctor_id: string;
  user_id?: string;
  name?: string;
  specialization?: string;
  department?: string;
  hospital?: string;
  experience?: number;
  experience_years?: number;
  rating?: number;
  avg_rating?: number;
  status?: string;
  is_available?: boolean;
}

function normalizeDoctor(raw: BackendDoctor): Doctor {
  const name = raw.name || 'Doctor';
  return {
    doctor_id: raw.doctor_id,
    user: { user_id: raw.user_id || raw.doctor_id, role: 'doctor', name, email: '' },
    specialty: raw.specialization || 'General Physician',
    department: raw.department || 'General Care',
    hospital: raw.hospital || '',
    experience_years: raw.experience_years ?? raw.experience ?? 0,
    is_available: raw.is_available ?? (raw.status === 'available' || raw.status === undefined),
    avg_rating: raw.avg_rating ?? raw.rating,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DoctorsScreen() {
  const router = useRouter();
  const { testMode, addFakeAppointment, theme } = useSettings();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingDoctor, setBookingDoctor] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState(todayIso());
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [hospital, setHospital] = useState('');
  const [reason, setReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const visibleDoctors = testMode
    ? [...fakeDoctors, ...doctors.filter((doctor) => !doctor.doctor_id.startsWith('FAKE-'))]
    : doctors.filter((doctor) => !doctor.doctor_id.startsWith('FAKE-'));

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await api.get<BackendDoctor[]>('/api/doctors');
        const rows = Array.isArray(res.data) ? res.data : [];
        setDoctors(rows.map(normalizeDoctor));
      } catch {
        Alert.alert('Doctors unavailable', 'Could not load doctors. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    void loadDoctors();
  }, []);

  const loadSlots = async (doctor: Doctor, date: string) => {
    setLoadingSlots(true);
    setBookingTime(null);
    if (doctor.doctor_id.startsWith('FAKE-')) {
      setAvailableSlots(['10:00 AM', '11:00 AM', '02:00 PM', '04:30 PM']);
      setLoadingSlots(false);
      return;
    }
    try {
      const res = await api.get<{ slots?: string[] }>(`/api/doctors/${doctor.doctor_id}/availability?date=${encodeURIComponent(date)}`);
      const data = res.data as unknown as { slots?: string[]; data?: { slots?: string[] } };
      setAvailableSlots(data?.slots ?? data?.data?.slots ?? []);
    } catch (error) {
      setAvailableSlots([]);
      setBookingError((error as Error).message || 'Could not load available times.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const openBooking = (doctor: Doctor) => {
    const date = todayIso();
    setSelectedDoctor(doctor);
    setBookingDate(date);
    setHospital(doctor.hospital || '');
    setReason('General consultation');
    setBookingError('');
    void loadSlots(doctor, date);
  };

  const closeBooking = () => {
    if (!bookingDoctor) setSelectedDoctor(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !bookingTime || !reason.trim()) {
      setBookingError('Choose a date and available time, then enter reason for visit. Clinic is optional.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      setBookingError('Use date format YYYY-MM-DD.');
      return;
    }

    setBookingDoctor(selectedDoctor.doctor_id);
    setBookingError('');
    const isFake = selectedDoctor.doctor_id.startsWith('FAKE-');
    try {
      if (isFake) {
        const fakeAppointment: Appointment = {
          appointment_id: `FAKE-APPT-${Date.now()}`,
          patient_id: 'FAKE-PATIENT',
          doctor_id: selectedDoctor.doctor_id,
          doctor_name: selectedDoctor.user.name,
          date: bookingDate,
          time: bookingTime,
          hospital: hospital.trim() || undefined,
          status: 'confirmed',
          reason: reason.trim(),
          urgency: 'green',
          is_fake: true,
        };
        addFakeAppointment(fakeAppointment);
        Alert.alert('Fake appointment added', `Test appointment scheduled with ${selectedDoctor.user.name}.`);
      } else {
        await api.post('/api/appointments', {
          doctor_id: selectedDoctor.doctor_id,
          date: bookingDate,
          time: bookingTime,
          hospital: hospital.trim(),
          reason: reason.trim(),
        });
        Alert.alert('Appointment request submitted', `Your appointment with ${selectedDoctor.user.name} is scheduled for ${bookingDate} at ${bookingTime}.`);
      }
      setSelectedDoctor(null);
    } catch (error) {
      Alert.alert('Appointment failed', (error as Error).message);
    } finally {
      setBookingDoctor(null);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={visibleDoctors}
        keyExtractor={(item) => item.doctor_id}
        contentContainerStyle={styles.container}
        renderItem={({ item: doctor }) => (
          <Card style={styles.card}>
            <Pressable accessibilityRole="button" onPress={() => router.push(`/doctor/${doctor.doctor_id}`)} style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{doctor.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{doctor.user.name}</Text>
                <Text style={styles.specialty}>{doctor.specialty}</Text>
                <Text style={styles.dept}>{doctor.department}</Text>
                {doctor.hospital ? <Text style={styles.hospital}>{doctor.hospital}</Text> : null}
              </View>
            </Pressable>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{doctor.experience_years} yrs exp</Text>
              {doctor.avg_rating && <Text style={styles.metaText}>★ {doctor.avg_rating.toFixed(1)}</Text>}
              <StatusBadge label={doctor.is_available ? 'Available' : 'Unavailable'} tone={doctor.is_available ? 'success' : 'danger'} />
            </View>
            {doctor.doctor_id.startsWith('FAKE-') && <StatusBadge label="Fake test data" tone="warning" />}
            <Button
              title={bookingDoctor === doctor.doctor_id ? 'Preparing...' : doctor.doctor_id.startsWith('FAKE-') ? 'Add Fake Appointment' : 'Schedule Appointment'}
              style={styles.bookBtn}
              onPress={() => openBooking(doctor)}
              disabled={!doctor.is_available || bookingDoctor !== null}
              loading={bookingDoctor === doctor.doctor_id}
            />
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No doctors available.</Text>}
      />

      <Modal visible={selectedDoctor !== null} transparent animationType="slide" onRequestClose={closeBooking}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.ink }]}>Schedule appointment</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.inkMuted }]}>Choose when, where, and why you want to see {selectedDoctor?.user.name}.</Text>
                </View>
                <Pressable onPress={closeBooking} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                  <Text style={[styles.closeText, { color: theme.inkMuted }]}>X</Text>
                </Pressable>
              </View>

              <TextField label="Date" value={bookingDate} onChangeText={(value) => { setBookingDate(value); setBookingTime(null); setBookingError(''); }} placeholder="YYYY-MM-DD" autoCapitalize="none" containerStyle={styles.modalField} />
              <Button title="Check available times" variant="secondary" onPress={() => selectedDoctor && loadSlots(selectedDoctor, bookingDate)} loading={loadingSlots} />

              <Text style={[styles.fieldLabel, { color: theme.inkMuted }]}>Choose a time</Text>
              {availableSlots.length === 0 && !loadingSlots ? <Text style={[styles.noSlots, { color: theme.inkSubtle }]}>No available times for this date.</Text> : null}
              <View style={styles.slotGrid}>
                {availableSlots.map((slot) => (
                  <Pressable key={slot} onPress={() => setBookingTime(slot)} style={({ pressed }) => [styles.slot, { backgroundColor: bookingTime === slot ? theme.primary : theme.surfaceMuted, borderColor: bookingTime === slot ? theme.primary : theme.border }, pressed && styles.pressed]}>
                    <Text style={{ color: bookingTime === slot ? theme.white : theme.ink, fontWeight: '600' }}>{slot}</Text>
                  </Pressable>
                ))}
              </View>

              {selectedDoctor?.hospital ? (
                <Pressable onPress={() => setHospital(selectedDoctor.hospital || '')} style={({ pressed }) => [styles.hospitalPreset, { backgroundColor: theme.primarySoft, borderColor: theme.border }, pressed && styles.pressed]}>
                  <Text style={[styles.presetLabel, { color: theme.inkMuted }]}>Existing clinic</Text>
                  <Text style={[styles.presetValue, { color: theme.primaryDark }]}>{selectedDoctor.hospital}</Text>
                  <Text style={[styles.presetAction, { color: theme.primary }]}>Use this clinic</Text>
                </Pressable>
              ) : null}
              <TextField label="Hospital or clinic (optional)" placeholder="Where should we schedule it?" value={hospital} onChangeText={(value) => { setHospital(value); setBookingError(''); }} containerStyle={styles.modalField} />
              <TextField label="Reason for visit" placeholder="What do you need help with?" value={reason} onChangeText={(value) => { setReason(value); setBookingError(''); }} multiline containerStyle={styles.modalField} />
              {bookingError ? <Text style={[styles.bookingError, { color: theme.danger }]}>{bookingError}</Text> : null}
              <Button title={selectedDoctor?.doctor_id.startsWith('FAKE-') ? 'Add fake appointment' : 'Confirm appointment'} onPress={handleConfirmBooking} loading={bookingDoctor !== null} disabled={bookingDoctor !== null} />
              <Button title="Cancel" variant="ghost" onPress={closeBooking} disabled={bookingDoctor !== null} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.horizontalPadding, paddingBottom: 40 },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  name: { ...typography.heading, color: colors.ink },
  specialty: { ...typography.body, color: colors.primary },
  dept: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  hospital: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
  meta: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, alignItems: 'center' },
  metaText: { ...typography.caption, color: colors.inkMuted },
  bookBtn: { width: '100%', marginTop: spacing.md },
  empty: { textAlign: 'center', color: colors.inkSubtle, marginTop: 40, fontSize: 16 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 42, 67, 0.46)' },
  modalCard: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: spacing.xl, paddingBottom: 36, gap: spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  modalTitle: { ...typography.title },
  modalSubtitle: { ...typography.body, marginTop: spacing.xs },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  closeText: { fontSize: 18, fontWeight: '700' },
  modalField: { marginTop: spacing.xs },
  bookingError: { ...typography.caption, marginTop: -spacing.xs },
  fieldLabel: { ...typography.label, marginTop: spacing.sm },
  noSlots: { ...typography.caption },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { minHeight: 44, minWidth: 100, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  hospitalPreset: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  presetLabel: { ...typography.caption },
  presetValue: { ...typography.label, fontSize: 15 },
  presetAction: { ...typography.caption, fontWeight: '700' },
  pressed: { opacity: 0.62, transform: [{ scale: 0.97 }] },
});
