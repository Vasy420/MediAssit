import type { Appointment, Doctor } from '../types';

export const fakeDoctors: Doctor[] = [
  {
    doctor_id: 'FAKE-DOC-001',
    user: { user_id: 'FAKE-USER-001', role: 'doctor', name: 'Dr. Aisha Mehta', email: 'fake.aisha@medassist.test' },
    specialty: 'General Physician',
    department: 'Primary Care',
    experience_years: 12,
    is_available: true,
    avg_rating: 4.8,
  },
  {
    doctor_id: 'FAKE-DOC-002',
    user: { user_id: 'FAKE-USER-002', role: 'doctor', name: 'Dr. Arjun Rao', email: 'fake.arjun@medassist.test' },
    specialty: 'Cardiologist',
    department: 'Heart Health',
    experience_years: 9,
    is_available: true,
    avg_rating: 4.7,
  },
];

export function createFakeAppointments(patientId: string): Appointment[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return [
    {
      appointment_id: 'FAKE-APPT-001',
      patient_id: patientId,
      doctor_id: 'FAKE-DOC-001',
      doctor_name: 'Dr. Aisha Mehta',
      date: today.toISOString(),
      time: '10:30 AM',
      hospital: 'Fake City Care Hospital',
      status: 'confirmed',
      reason: 'Routine health check',
      urgency: 'green',
      is_fake: true,
    },
    {
      appointment_id: 'FAKE-APPT-002',
      patient_id: patientId,
      doctor_id: 'FAKE-DOC-002',
      doctor_name: 'Dr. Arjun Rao',
      date: tomorrow.toISOString(),
      time: '02:00 PM',
      hospital: 'Fake City Care Hospital',
      status: 'pending',
      reason: 'Test booking flow',
      urgency: 'yellow',
      is_fake: true,
    },
  ];
}
