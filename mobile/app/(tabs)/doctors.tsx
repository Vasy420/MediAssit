import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { api } from '../../src/api/client';
import type { Doctor } from '../../src/types';

export default function DoctorsScreen() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingDoctor, setBookingDoctor] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await api.get<{ doctors: Doctor[] }>('/api/doctors');
        setDoctors(((res.data as { doctors: Doctor[] })?.doctors) ?? []);
      } catch (e) {
        Alert.alert('Error', 'Could not load doctors. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();
  }, []);

  const handleBook = async (doctor: Doctor) => {
    setBookingDoctor(doctor.doctor_id);
    try {
      const today = new Date();
      const date = today.toISOString().split('T')[0];
      const res = await api.post<{ slots: string[] }>(`/api/doctors/${doctor.doctor_id}/slots`, { date });
      const slots = ((res.data as { slots?: string[] })?.slots) ?? [];
      if (slots.length > 0) {
        await api.post('/api/appointments', {
          doctor_id: doctor.doctor_id,
          date,
          time: slots[0],
          reason: 'General consultation',
        });
        Alert.alert('Booked!', `Appointment with ${doctor.user.name} on ${date} at ${slots[0]}`);
      } else {
        Alert.alert('No Slots', 'No available slots today. Try another date.');
      }
    } catch (e) {
      Alert.alert('Booking Failed', (e as Error).message);
    } finally {
      setBookingDoctor(null);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />;
  }

  return (
    <FlatList
      data={doctors}
      keyExtractor={(item) => item.doctor_id}
      contentContainerStyle={styles.container}
      renderItem={({ item: doctor }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {doctor.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{doctor.user.name}</Text>
              <Text style={styles.specialty}>{doctor.specialty}</Text>
              <Text style={styles.dept}>{doctor.department}</Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{doctor.experience_years} yrs exp</Text>
            {doctor.avg_rating && <Text style={styles.metaText}>★ {doctor.avg_rating.toFixed(1)}</Text>}
            <Text style={[styles.metaText, { color: doctor.is_available ? '#16A34A' : '#DC2626' }]}>
              {doctor.is_available ? 'Available' : 'Unavailable'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, (!doctor.is_available || bookingDoctor === doctor.doctor_id) && styles.bookBtnDisabled]}
            onPress={() => handleBook(doctor)}
            disabled={!doctor.is_available || bookingDoctor !== null}
          >
            <Text style={styles.bookBtnText}>
              {bookingDoctor === doctor.doctor_id ? 'Booking...' : 'Book Appointment'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No doctors available.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  name: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  specialty: { fontSize: 14, color: '#2563EB' },
  dept: { fontSize: 12, color: '#64748B', marginTop: 2 },
  meta: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metaText: { fontSize: 13, color: '#475569' },
  bookBtn: { backgroundColor: '#2563EB', borderRadius: 8, padding: 12, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: '#94A3B8' },
  bookBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 16 },
});
