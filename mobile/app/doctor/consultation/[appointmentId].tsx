import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { api } from '../../../src/api/client';
import { fakePatientSummary } from '../../../src/data/testData';
import { Button } from '../../../src/ui/Button';
import { Card } from '../../../src/ui/Card';
import { FadeSlide } from '../../../src/ui/motion';
import { Screen } from '../../../src/ui/Screen';
import { StatusBadge } from '../../../src/ui/StatusBadge';
import { TextField } from '../../../src/ui/TextField';
import { colors, layout, spacing, typography } from '../../../src/ui/theme';

interface ConsultationData {
  appointment: { appointment_id: string; date: string; time: string; reason?: string; status: string; urgency?: string };
  patient: {
    patient_id: string;
    name: string;
    age?: number;
    gender?: string;
    blood_group?: string;
    existing_conditions?: string[];
    allergies?: string[];
    medical_history?: string;
  };
  preconsult_summary?: {
    chief_complaint?: string;
    symptoms?: { duration?: string; severity?: string; associated?: string }[];
    medications?: string[];
    allergies?: string[];
    medical_history?: string;
    lifestyle_notes?: string;
    vital_signs?: { temperature?: string };
    clinical_summary?: string;
    urgency?: string;
    status?: string;
  } | null;
  urgency?: string;
  notes?: { note_id: string; content: string; created_at: string }[];
}

function unwrap<T>(res: { data?: T } | T): T {
  return ((res as { data?: T }).data ?? res) as T;
}

export default function ConsultationScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const isFake = appointmentId.startsWith('FAKE-');
  const [data, setData] = useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (isFake) {
      setData({
        appointment: { appointment_id: appointmentId, date: new Date().toISOString().slice(0, 10), time: '09:30 AM', reason: 'Demo visit', status: 'confirmed', urgency: 'orange' },
        patient: fakePatientSummary.patient,
        preconsult_summary: {
          ...fakePatientSummary.preconsult_summary,
          clinical_summary: 'Demo patient reports shortness of breath after exercise. Uses a salbutamol inhaler.',
          urgency: 'orange',
          symptoms: [{ duration: 'A few days', severity: 'moderate', associated: 'Worse with exertion' }],
        },
        urgency: 'orange',
        notes: [],
      });
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<ConsultationData>(`/api/doctor-dashboard/consultation/${appointmentId}`);
      setData(unwrap(res));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, isFake]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const saveNote = async () => {
    if (!note.trim()) return;
    if (isFake) {
      setData((current) => current ? {
        ...current,
        notes: [{ note_id: `FAKE-NOTE-${Date.now()}`, content: note.trim(), created_at: new Date().toISOString() }, ...(current.notes ?? [])],
      } : current);
      setNote('');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/doctor-dashboard/notes', { appointment_id: appointmentId, content: note.trim() });
      setNote('');
      await load();
    } catch (error) {
      Alert.alert('Could not save note', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;
  if (!data) return <Screen><Text style={styles.empty}>Consultation not found.</Text></Screen>;

  const urgency = data.urgency || data.preconsult_summary?.urgency || data.appointment.urgency || '';
  const summary = data.preconsult_summary;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <FadeSlide>
          <View style={styles.header}>
            <Text style={styles.title}>{data.patient.name}</Text>
            {urgency ? <StatusBadge label={urgency} tone={urgency === 'red' ? 'danger' : urgency === 'green' ? 'success' : 'warning'} /> : null}
          </View>
          <Text style={styles.meta}>{data.appointment.date} · {data.appointment.time} · {data.appointment.status.replace(/_/g, ' ')}</Text>
        </FadeSlide>

        <FadeSlide delay={80}>
        <Card>
          <Text style={styles.section}>Patient details</Text>
          <Text style={styles.field}>Age: {data.patient.age ?? 'N/A'} · {data.patient.gender || 'Gender N/A'}</Text>
          <Text style={styles.field}>Blood group: {data.patient.blood_group || 'N/A'}</Text>
          <Text style={styles.field}>Conditions: {(data.patient.existing_conditions ?? []).join(', ') || 'None listed'}</Text>
          <Text style={styles.field}>Allergies: {(data.patient.allergies ?? []).join(', ') || 'None listed'}</Text>
        </Card>
        </FadeSlide>

        <FadeSlide delay={160}>
        <Card>
          <Text style={styles.section}>AI pre-consultation summary</Text>
          {summary?.clinical_summary ? <Text style={styles.body}>{summary.clinical_summary}</Text> : <Text style={styles.empty}>No AI summary yet. The patient has not finished pre-consultation.</Text>}
          {summary?.chief_complaint ? <Text style={styles.field}>Complaint: {summary.chief_complaint}</Text> : null}
          {(summary?.symptoms ?? []).map((item, index) => (
            <Text key={index} style={styles.field}>
              Symptoms: {item.severity || 'unspecified'} · {item.duration || 'duration unknown'}
              {item.associated ? ` · ${item.associated}` : ''}
            </Text>
          ))}
          {data.appointment.reason ? <Text style={styles.field}>Visit reason: {data.appointment.reason}</Text> : null}
        </Card>
        </FadeSlide>

        <FadeSlide delay={240}>
        <Card>
          <Text style={styles.section}>Doctor notes</Text>
          {(data.notes ?? []).length === 0 ? <Text style={styles.empty}>No notes yet.</Text> : (data.notes ?? []).map((item) => (
            <View key={item.note_id} style={styles.note}>
              <Text style={styles.body}>{item.content}</Text>
              <Text style={styles.noteDate}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          ))}
          <TextField value={note} onChangeText={setNote} placeholder="Add a consultation note" multiline containerStyle={{ marginTop: spacing.md }} />
          <Button title="Save note" icon="save-outline" size="lg" onPress={() => void saveNote()} loading={saving} disabled={!note.trim() || saving} />
        </Card>
        </FadeSlide>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.title, color: colors.ink, flex: 1 },
  meta: { ...typography.caption, color: colors.inkMuted },
  section: { ...typography.heading, color: colors.ink, marginBottom: spacing.sm },
  field: { ...typography.body, color: colors.inkMuted, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.ink, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.xl },
  note: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  noteDate: { ...typography.caption, color: colors.inkSubtle },
});
