import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { MedicalReport } from '../../src/types';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<MedicalReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await api.get<MedicalReport>(`/api/reports/${id}`);
        setReport((res.data as unknown as MedicalReport) ?? null);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadReport();
  }, [id]);

  if (loading) return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />;
  if (!report) return <Text style={styles.error}>Report not found.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Medical Report</Text>
      <Text style={styles.date}>{new Date(report.date).toLocaleDateString('en-US', { dateStyle: 'long' })}</Text>

      <Field label="Symptoms" value={report.symptoms} />
      <Field label="Clinical Observations" value={report.clinical_observations} />
      <Field label="Diagnosis" value={report.doctor_diagnosis} />
      <Field label="Treatment" value={report.treatment} />
      <Field label="Follow-up" value={report.follow_up} />
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  date: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  error: { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 16 },
  field: { marginBottom: 16, backgroundColor: '#FFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  fieldLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  fieldValue: { fontSize: 15, color: '#1E293B', lineHeight: 22 },
});
