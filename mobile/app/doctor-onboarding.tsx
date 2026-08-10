import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api/client';
import { useSettings } from '../src/contexts/SettingsContext';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { TextField } from '../src/ui/TextField';
import { colors, radii, spacing, typography } from '../src/ui/theme';

export default function DoctorOnboardingScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const [specialization, setSpecialization] = useState('');
  const [department, setDepartment] = useState('');
  const [hospital, setHospital] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get<{ doctor: { specialization?: string; department?: string; hospital?: string; qualification?: string; experience?: number; consultation_fee?: number; room_number?: string } }>('/api/doctors/me');
        const doctor = res.data?.doctor;
        if (doctor?.specialization) setSpecialization(doctor.specialization);
        if (doctor?.department) setDepartment(doctor.department);
        if (doctor?.hospital) setHospital(doctor.hospital);
        if (doctor?.qualification) setQualification(doctor.qualification);
        if (doctor?.experience !== undefined) setExperience(String(doctor.experience));
        if (doctor?.consultation_fee !== undefined) setConsultationFee(String(doctor.consultation_fee));
        if (doctor?.room_number) setRoomNumber(doctor.room_number);
        if (doctor?.specialization && doctor.department && doctor.hospital) router.replace('/(tabs-doctor)/dashboard');
      } catch {
        // New doctor account has no doctor profile yet.
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [router]);

  const saveProfile = async () => {
    if (!specialization.trim() || !department.trim() || !hospital.trim()) {
      setError('Specialization, department, and hospital are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch('/api/doctors/me', {
        specialization: specialization.trim(),
        department: department.trim(),
        hospital: hospital.trim(),
        qualification: qualification.trim(),
        experience: experience ? Number(experience) : 0,
        consultation_fee: consultationFee ? Number(consultationFee) : 0,
        room_number: roomNumber.trim(),
        status: 'available',
      });
      router.replace('/(tabs-doctor)/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 80 }} />;

  return (
    <Screen padded={false} style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.icon, { backgroundColor: theme.primary }]}><Text style={[styles.iconText, { color: theme.onPrimary }]}>+</Text></View>
        <Text style={[styles.title, { color: theme.ink }]}>Set up your doctor profile</Text>
        <Text style={[styles.subtitle, { color: theme.inkMuted }]}>Complete these details so patients can find you and book the right care.</Text>

        <Card style={styles.card}>
          <TextField label="Specialization" placeholder="Cardiology, Pediatrics, etc." value={specialization} onChangeText={setSpecialization} containerStyle={styles.field} />
          <TextField label="Department" placeholder="Heart Health, Primary Care, etc." value={department} onChangeText={setDepartment} containerStyle={styles.field} />
          <TextField label="Hospital or clinic" placeholder="Where do you practice?" value={hospital} onChangeText={setHospital} containerStyle={styles.field} />
          <TextField label="Qualification" placeholder="MBBS, MD, etc. (optional)" value={qualification} onChangeText={setQualification} containerStyle={styles.field} />
          <TextField label="Years of experience" placeholder="0" value={experience} onChangeText={setExperience} keyboardType="number-pad" containerStyle={styles.field} />
          <TextField label="Consultation fee" placeholder="0 (optional)" value={consultationFee} onChangeText={setConsultationFee} keyboardType="decimal-pad" containerStyle={styles.field} />
          <TextField label="Room number" placeholder="Room or desk (optional)" value={roomNumber} onChangeText={setRoomNumber} />
        </Card>

        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
        <Button title={saving ? 'Saving...' : 'Open doctor dashboard'} onPress={saveProfile} loading={saving} disabled={saving} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 40 },
  icon: { width: 52, height: 52, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  iconText: { fontSize: 28, fontWeight: '800' },
  title: { ...typography.display },
  subtitle: { ...typography.body, marginTop: spacing.sm, marginBottom: spacing.xxl },
  card: { gap: spacing.md, marginBottom: spacing.lg },
  field: { marginBottom: spacing.sm },
  error: { ...typography.body, marginBottom: spacing.md },
});
