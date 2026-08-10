import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

interface MedicalReport {
  report_id: string;
  patient_id: string;
  doctor_diagnosis: string;
  created_at: string;
  symptoms?: string[];
}

export default function DoctorReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await api.get<{ reports: MedicalReport[] }>('/api/reports/doctor');
        setReports(((res.data as { reports?: MedicalReport[] })?.reports) ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Reports</Text>
      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No reports yet.</Text>
      ) : (
        reports.map((report) => (
          <Pressable
            key={report.report_id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push(`/reports/${report.report_id}`)}
          >
            <Text style={styles.reportId}>Report #{report.report_id}</Text>
            <Text style={styles.diagnosis}>{report.doctor_diagnosis}</Text>
            <Text style={styles.date}>{new Date(report.created_at).toLocaleDateString()}</Text>
            {report.symptoms && report.symptoms.length > 0 && (
              <Text style={styles.symptoms}>Symptoms: {report.symptoms.join(', ')}</Text>
            )}
          </Pressable>
        ))
      )}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  emptyText: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: 40 },
  card: { marginBottom: spacing.md },
  reportId: { ...typography.caption, color: colors.inkSubtle, fontWeight: '600' },
  diagnosis: { ...typography.heading, color: colors.ink, marginTop: spacing.xs },
  date: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
  symptoms: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
