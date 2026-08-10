export interface User {
  user_id: string;
  role: 'patient' | 'doctor';
  name: string;
  email: string;
  phone?: string;
}

export interface Patient extends User {
  age?: number;
  gender?: string;
  existing_conditions?: string[];
}

export interface Doctor {
  user: User;
  doctor_id: string;
  specialty: string;
  department: string;
  experience_years: number;
  is_available: boolean;
  avg_rating?: number;
}

export interface Appointment {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  reason?: string;
  urgency?: 'green' | 'yellow' | 'orange' | 'red';
}

export interface QueueEntry {
  queue_id: string;
  patient_id: string;
  doctor_id: string;
  position: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'cancelled';
  estimated_wait_minutes: number;
}

export interface MedicalReport {
  report_id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  symptoms?: string;
  clinical_observations?: string;
  doctor_diagnosis?: string;
  treatment?: string;
  follow_up?: string;
}

export interface TriageQuestion {
  type: 'question';
  question: {
    id: string;
    key: string;
    text: string;
    rephrased: boolean;
    options: { id: string; key: string; text: string; emoji: string }[];
  };
  done: boolean;
}

export interface TriageResult {
  type: 'result';
  triage: {
    symptoms: { name: string; category: string }[];
    duration: { label: string; days?: number };
    severity: { level: string; label: string };
    urgency: { level: string; label: string };
    recommended_specialties: { code: string; specialty: string; department: string; relevance: number }[];
    emergency_flag: boolean;
    warning_signs: string[];
    reason: string;
    disclaimer: string;
  };
}

export type ChatTurn = TriageQuestion | TriageResult;

export interface PreConsultSummary {
  pc_id: string;
  appointment_id: string;
  chief_complaint: string;
  symptoms: { duration: string; severity: string }[];
  medications: string[];
  allergies: string[];
  medical_history: string;
  lifestyle_notes: string;
  vital_signs: Record<string, string>;
  triage_context: Record<string, unknown>;
  status: 'in_progress' | 'completed';
}

export interface DoctorDashboardData {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  today_appointments: {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    time: string;
    urgency: string;
    status: string;
    queue_position: string | null;
    queue_status: string | null;
  }[];
  total_today: number;
  queue_length: number;
  urgency_breakdown: { red: number; orange: number; yellow: number; green: number };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
