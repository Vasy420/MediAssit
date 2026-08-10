import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../src/api/client';
import { useSettings } from '../src/contexts/SettingsContext';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { TextField } from '../src/ui/TextField';
import { colors, radii, spacing, typography } from '../src/ui/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_SCHEDULE = Object.fromEntries(DAYS.map((day) => [day, '09:00 AM, 10:30 AM, 02:00 PM'])) as Record<string, string>;
const SPECIALIZATIONS = ['General Physician', 'Cardiologist', 'Orthopedic Specialist', 'Gynecologist', 'Neurologist', 'Dermatologist', 'Pediatrician', 'ENT Specialist', 'Pulmonologist', 'Endocrinologist', 'Other'];
const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Orthopedics', 'Gynecology', 'Neurology', 'Dermatology', 'Pediatrics', 'ENT', 'Pulmonology', 'Endocrinology', 'Other'];

export default function DoctorOnboardingScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEditing = edit === 'true';
  const { theme } = useSettings();
  const [specializationChoice, setSpecializationChoice] = useState('');
  const [specializationOther, setSpecializationOther] = useState('');
  const [departmentChoice, setDepartmentChoice] = useState('');
  const [departmentOther, setDepartmentOther] = useState('');
  const [hospital, setHospital] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [schedule, setSchedule] = useState<Record<string, string>>(DEFAULT_SCHEDULE);
  const [timePickerDay, setTimePickerDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get<{ doctor: { specialization?: string; department?: string; hospital?: string; qualification?: string; experience?: number; consultation_fee?: number; room_number?: string; availability?: { day: string; slots?: string[] }[] } }>('/api/doctors/me');
        const doctor = res.data?.doctor;
        if (doctor?.specialization) {
          if (SPECIALIZATIONS.includes(doctor.specialization)) setSpecializationChoice(doctor.specialization);
          else { setSpecializationChoice('Other'); setSpecializationOther(doctor.specialization); }
        }
        if (doctor?.department) {
          if (DEPARTMENTS.includes(doctor.department)) setDepartmentChoice(doctor.department);
          else { setDepartmentChoice('Other'); setDepartmentOther(doctor.department); }
        }
        if (doctor?.hospital) setHospital(doctor.hospital);
        if (doctor?.qualification) setQualification(doctor.qualification);
        if (doctor?.experience !== undefined) setExperience(String(doctor.experience));
        if (doctor?.consultation_fee !== undefined) setConsultationFee(String(doctor.consultation_fee));
        if (doctor?.room_number) setRoomNumber(doctor.room_number);
        if (doctor?.availability?.length) {
          setSchedule((current) => doctor.availability!.reduce((next, row) => ({ ...next, [row.day]: row.slots?.join(', ') ?? '' }), current));
        }
        if (!isEditing && doctor?.specialization && doctor.department && doctor.hospital) router.replace('/(tabs-doctor)/dashboard');
      } catch {
        // New doctor account has no doctor profile yet.
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [isEditing, router]);

  const saveProfile = async () => {
    const specialization = (specializationChoice === 'Other' ? specializationOther : specializationChoice).trim();
    const department = (departmentChoice === 'Other' ? departmentOther : departmentChoice).trim();
    if (!specialization || !department || !hospital.trim()) {
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
        availability: DAYS.map((day) => ({
          day,
          slots: (schedule[day] ?? '').split(',').map((slot) => slot.trim()).filter(Boolean),
        })),
        status: 'available',
      });
      if (isEditing) router.back();
      else router.replace('/(tabs-doctor)/dashboard');
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
        <Text style={[styles.title, { color: theme.ink }]}>{isEditing ? 'Edit your doctor profile' : 'Set up your doctor profile'}</Text>
        <Text style={[styles.subtitle, { color: theme.inkMuted }]}>Complete these details so patients can find you and book the right care.</Text>

        <Card style={styles.card}>
          <DropdownField label="Specialization" value={specializationChoice} options={SPECIALIZATIONS} onChange={setSpecializationChoice} theme={theme} />
          {specializationChoice === 'Other' && <TextField label="Your specialization" placeholder="Type specialization" value={specializationOther} onChangeText={setSpecializationOther} containerStyle={styles.field} />}
          <DropdownField label="Department" value={departmentChoice} options={DEPARTMENTS} onChange={setDepartmentChoice} theme={theme} />
          {departmentChoice === 'Other' && <TextField label="Your department" placeholder="Type department" value={departmentOther} onChangeText={setDepartmentOther} containerStyle={styles.field} />}
          <TextField label="Hospital or clinic" placeholder="Where do you practice?" value={hospital} onChangeText={setHospital} containerStyle={styles.field} />
          <TextField label="Qualification" placeholder="MBBS, MD, etc. (optional)" value={qualification} onChangeText={setQualification} containerStyle={styles.field} />
          <TextField label="Years of experience" placeholder="0" value={experience} onChangeText={setExperience} keyboardType="number-pad" containerStyle={styles.field} />
          <TextField label="Consultation fee" placeholder="0 (optional)" value={consultationFee} onChangeText={setConsultationFee} keyboardType="decimal-pad" containerStyle={styles.field} />
          <TextField label="Room number" placeholder="Room or desk (optional)" value={roomNumber} onChangeText={setRoomNumber} />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.scheduleTitle, { color: theme.ink }]}>Appointment times</Text>
          <Text style={[styles.scheduleHint, { color: theme.inkMuted }]}>Add bookable times for each day. Tap a time to remove it.</Text>
          {DAYS.map((day) => (
            <View key={day} style={[styles.daySchedule, { borderColor: theme.border }]}>
              <Text style={[styles.dayLabel, { color: theme.ink }]}>{day}</Text>
              <View style={styles.schedulePills}>
                {(schedule[day] ?? '').split(',').map((slot) => slot.trim()).filter(Boolean).map((slot) => (
                  <Pressable key={slot} onPress={() => setSchedule((current) => ({ ...current, [day]: (current[day] ?? '').split(',').map((item) => item.trim()).filter((item) => item && item !== slot).join(', ') }))} style={[styles.schedulePill, { backgroundColor: theme.primarySoft }]}>
                    <Text style={{ color: theme.primaryDark }}>{slot}</Text>
                    <Text style={{ color: theme.primaryDark }}> x</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setTimePickerDay(day)} style={[styles.addTimePill, { borderColor: theme.primary }]}>
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>+ Add time</Text>
                </Pressable>
              </View>
              {timePickerDay === day && (
                <DateTimePicker
                  value={new Date(2000, 0, 1, 9, 0)}
                  mode="time"
                  onChange={(_event, date) => {
                    setTimePickerDay(null);
                    if (!date) return;
                    const hours = date.getHours();
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const hour = hours % 12 || 12;
                    const slot = `${String(hour).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${period}`;
                    setSchedule((current) => ({ ...current, [day]: [...new Set((current[day] ?? '').split(',').map((item) => item.trim()).filter(Boolean).concat(slot))].join(', ') }));
                  }}
                />
              )}
            </View>
          ))}
        </Card>

        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
        <Button title={saving ? 'Saving...' : isEditing ? 'Save profile changes' : 'Open doctor dashboard'} onPress={saveProfile} loading={saving} disabled={saving} />
      </ScrollView>
    </Screen>
  );
}

function DropdownField({ label, value, options, onChange, theme }: { label: string; value: string; options: string[]; onChange: (value: string) => void; theme: ReturnType<typeof useSettings>['theme'] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownWrap}>
      <Text style={[styles.dropdownLabel, { color: theme.inkMuted }]}>{label}</Text>
      <Pressable onPress={() => setOpen((current) => !current)} style={({ pressed }) => [styles.dropdownButton, { backgroundColor: theme.surface, borderColor: theme.borderStrong }, pressed && styles.pressed]}>
        <Text style={{ color: value ? theme.ink : theme.inkSubtle }}>{value || `Choose ${label.toLowerCase()}`}</Text>
        <Text style={{ color: theme.primary }}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={[styles.dropdownOptions, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
          {options.map((option) => (
            <Pressable key={option} onPress={() => { onChange(option); setOpen(false); }} style={({ pressed }) => [styles.dropdownOption, { borderBottomColor: theme.border }, pressed && styles.pressed]}>
              <Text style={{ color: theme.ink }}>{option}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
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
  dropdownWrap: { marginBottom: spacing.sm },
  dropdownLabel: { ...typography.label, marginBottom: spacing.sm },
  dropdownButton: { minHeight: 48, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownOptions: { borderWidth: 1, borderRadius: radii.md, marginTop: spacing.xs, overflow: 'hidden' },
  dropdownOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  pressed: { opacity: 0.72 },
  scheduleTitle: { ...typography.heading, marginBottom: spacing.xs },
  scheduleHint: { ...typography.caption, marginBottom: spacing.md },
  daySchedule: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  dayLabel: { ...typography.label },
  schedulePills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  schedulePill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, flexDirection: 'row' },
  addTimePill: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
});
