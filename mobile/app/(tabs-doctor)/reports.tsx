import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';

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

  if (loading) return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Reports</Text>
      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No reports yet.</Text>
      ) : (
        reports.map((report) => (
          <TouchableOpacity
            key={report.report_id}
            style={styles.card}
            onPress={() => router.push(`/reports/${report.report_id}`)}
          >
            <Text style={styles.reportId}>Report #{report.report_id}</Text>
            <Text style={styles.diagnosis}>{report.doctor_diagnosis}</Text>
            <Text style={styles.date}>{new Date(report.created_at).toLocaleDateString()}</Text>
            {report.symptoms && report.symptoms.length > 0 && (
              <Text style={styles.symptoms}>Symptoms: {report.symptoms.join(', ')}</Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  reportId: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  diagnosis: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 4 },
  date: { fontSize: 13, color: '#64748B', marginTop: 4 },
  symptoms: { fontSize: 13, color: '#475569', marginTop: 4 },
});
