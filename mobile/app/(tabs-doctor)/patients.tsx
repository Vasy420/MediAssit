import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { fakePatientSummary } from '../../src/data/testData';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { TextField } from '../../src/ui/TextField';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

interface PatientSummary {
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
  preconsult_summary?: Record<string, unknown> | null;
  triage_result?: Record<string, unknown> | null;
  urgency?: string;
  recent_reports?: { report_id: string; diagnosis: string; date: string; is_fake?: boolean }[];
}

export default function PatientsScreen() {
  const router = useRouter();
  const { testMode } = useSettings();
  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchPatient = async () => {
    if (!patientId.trim()) return;
    setLoading(true);
    setSearched(true);
    if (testMode && patientId.trim().toUpperCase().startsWith('FAKE')) {
      setPatient(fakePatientSummary as PatientSummary);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<PatientSummary>(`/api/doctor-dashboard/patient-summary/${patientId.trim()}`);
      setPatient(res.data as unknown as PatientSummary);
    } catch {
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Patient Lookup</Text>
      <View style={styles.searchRow}>
        <TextField
          value={patientId}
          onChangeText={setPatientId}
          placeholder="Enter patient ID (e.g., P001)"
          containerStyle={styles.searchInput}
        />
        <Button title="Search" style={styles.searchBtn} onPress={searchPatient} disabled={loading} loading={loading} />
      </View>
      {testMode && <Text style={styles.testHint}>Test mode: search `FAKE-P001` to view demo patient data.</Text>}

      {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.xl }} />}

      {searched && !loading && !patient && (
        <Text style={styles.emptyText}>Patient not found.</Text>
      )}

      {patient && (
        <Card style={styles.resultCard}>
          {patient.patient.patient_id.startsWith('FAKE-') && <StatusBadge label="Fake test data" tone="warning" />}
          <Text style={styles.sectionTitle}>Patient Profile</Text>
          <Text style={styles.field}>Name: {patient.patient.name}</Text>
          <Text style={styles.field}>Age: {patient.patient.age ?? 'N/A'}</Text>
          <Text style={styles.field}>Gender: {patient.patient.gender ?? 'N/A'}</Text>
          <Text style={styles.field}>Blood Group: {patient.patient.blood_group ?? 'N/A'}</Text>
          {patient.patient.existing_conditions && patient.patient.existing_conditions.length > 0 && (
            <Text style={styles.field}>Conditions: {patient.patient.existing_conditions.join(', ')}</Text>
          )}
          {patient.patient.allergies && patient.patient.allergies.length > 0 && (
            <Text style={styles.field}>Allergies: {patient.patient.allergies.join(', ')}</Text>
          )}
          {patient.patient.medical_history && (
            <Text style={styles.field}>History: {patient.patient.medical_history}</Text>
          )}

          {patient.preconsult_summary && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Pre-Consultation Summary</Text>
              {(patient.preconsult_summary as { chief_complaint?: string })?.chief_complaint && (
                <Text style={styles.field}>
                  Complaint: {(patient.preconsult_summary as { chief_complaint: string }).chief_complaint}
                </Text>
              )}
              {(patient.preconsult_summary as { medications?: string[] })?.medications && (
                <Text style={styles.field}>
                  Medications: {(patient.preconsult_summary as { medications: string[] }).medications.join(', ') || 'None'}
                </Text>
              )}
            </>
          )}

          {patient.urgency && (
            <StatusBadge label={patient.urgency} tone={patient.urgency === 'red' ? 'danger' : patient.urgency === 'orange' || patient.urgency === 'yellow' ? 'warning' : 'success'} />
          )}

          {patient.recent_reports && patient.recent_reports.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Reports</Text>
              {patient.recent_reports.map((r) => (
                <Pressable
                  key={r.report_id}
                  style={({ pressed }) => [styles.reportItem, pressed && styles.pressed]}
                  onPress={() => r.is_fake ? Alert.alert('Fake test data', 'This report is local demo data.') : router.push(`/reports/${r.report_id}`)}
                >
                  <Text style={styles.field}>{r.diagnosis}</Text>
                  <Text style={styles.reportDate}>{new Date(r.date).toLocaleDateString()}</Text>
                </Pressable>
              ))}
            </>
          )}
        </Card>
      )}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, alignItems: 'flex-end' },
  searchInput: { flex: 1 },
  searchBtn: { minWidth: 92 },
  testHint: { ...typography.caption, color: colors.warning, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.xl },
  resultCard: { padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.sm },
  field: { ...typography.body, color: colors.inkMuted, marginBottom: spacing.xs },
  reportItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
  reportDate: { ...typography.caption, color: colors.inkSubtle },
  pressed: { opacity: 0.78 },
});
