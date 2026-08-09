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

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
