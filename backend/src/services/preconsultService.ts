import { PreConsultation } from '../models/PreConsultation.js';
import { nextId } from '../utils/idGen.js';

export async function getOrCreatePreConsult(
  patientId: string,
  appointmentId: string,
): Promise<{ pc_id: string; status: string }> {
  let pc = await PreConsultation.findOne({
    patient_id: patientId,
    appointment_id: appointmentId,
  }).lean();

  if (!pc) {
    const pcId = await nextId('PC', 3);
    const created = await PreConsultation.create({
      pc_id: pcId,
      patient_id: patientId,
      appointment_id: appointmentId,
      status: 'in_progress',
    });
    return { pc_id: created.pc_id, status: created.status };
  }

  return { pc_id: pc.pc_id, status: pc.status };
}

export async function savePreConsultAnswers(
  pcId: string,
  answers: { key: string; answer: string; rephrased?: boolean }[],
  messages: { role: string; text: string }[],
) {
  const pc = await PreConsultation.findOne({ pc_id: pcId });
  if (!pc) return null;
  return pc;
}

export async function completePreConsult(
  pcId: string,
  summary: Record<string, unknown>,
  messages: { role: string; text: string }[],
  answers: { key: string; answer: string; rephrased?: boolean }[],
) {
  const pc = await PreConsultation.findOneAndUpdate(
    { pc_id: pcId },
    {
      $set: {
        chief_complaint: summary.chief_complaint || '',
        symptoms: summary.symptoms || [],
        medications: summary.medications || [],
        allergies: summary.allergies || [],
        medical_history: summary.medical_history || '',
        lifestyle_notes: summary.lifestyle_notes || '',
        vital_signs: summary.vital_signs || {},
        triage_context: summary.triage_context || {},
        status: 'completed',
        updated_at: new Date(),
      },
    },
    { new: true },
  ).lean();

  return pc;
}

export async function getPreConsultByAppointment(appointmentId: string) {
  return PreConsultation.findOne({ appointment_id: appointmentId }).lean();
}

export async function getPreConsultByPatient(patientId: string) {
  return PreConsultation.find({ patient_id: patientId })
    .sort({ created_at: -1 })
    .lean();
}
