import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';

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
  recent_reports?: { report_id: string; diagnosis: string; date: string }[];
}

export default function PatientsScreen() {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchPatient = async () => {
    if (!patientId.trim()) return;
    setLoading(true);
    setSearched(true);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Patient Lookup</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={patientId}
          onChangeText={setPatientId}
          placeholder="Enter patient ID (e.g., P001)"
          placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchPatient} disabled={loading}>
          <Text style={styles.searchBtnText}>{loading ? '...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 20 }} />}

      {searched && !loading && !patient && (
        <Text style={styles.emptyText}>Patient not found.</Text>
      )}

      {patient && (
        <View style={styles.resultCard}>
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
            <Text style={styles.field}>Urgency: {patient.urgency.toUpperCase()}</Text>
          )}

          {patient.recent_reports && patient.recent_reports.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Reports</Text>
              {patient.recent_reports.map((r) => (
                <TouchableOpacity
                  key={r.report_id}
                  style={styles.reportItem}
                  onPress={() => router.push(`/reports/${r.report_id}`)}
                >
                  <Text style={styles.field}>{r.diagnosis}</Text>
                  <Text style={styles.reportDate}>{new Date(r.date).toLocaleDateString()}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#FFF', color: '#1E293B' },
  searchBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, justifyContent: 'center' },
  searchBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 20 },
  resultCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  field: { fontSize: 14, color: '#475569', marginBottom: 4 },
  reportItem: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 },
  reportDate: { fontSize: 12, color: '#94A3B8' },
});
