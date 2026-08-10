import { Request, Response } from 'express';
import { aiPreConsult, PreConsultTurn } from '../services/aiClient.js';
import {
  getOrCreatePreConsult,
  completePreConsult,
  savePreConsultAnswers,
  getPreConsultByAppointment,
} from '../services/preconsultService.js';
import { getPatientForUser } from '../services/patientService.js';
import { Conversation } from '../models/Conversation.js';
import { Errors } from '../utils/ApiError.js';

export async function handleStartPreConsult(req: Request, res: Response) {
  const { appointment_id } = req.body as { appointment_id: string };
  if (!appointment_id) throw Errors.badRequest('appointment_id is required');

  if (req.user!.role !== 'patient') throw Errors.badRequest('Only patients can complete pre-consultation');

  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');

  const pc = await getOrCreatePreConsult(patient.patient_id, appointment_id);

  const conversation = await Conversation.findOne({ patient_id: patient.patient_id, status: 'completed' })
    .sort({ updated_at: -1 })
    .lean();

  const turn = await aiPreConsult({
    patient_id: patient.patient_id,
    appointment_id,
    triage_context: conversation?.triage_result as Record<string, unknown> | undefined,
    patient_context: {
      age: patient.age ?? null,
      gender: patient.gender ?? null,
      existing_conditions: patient.existing_conditions,
    },
    messages: [],
    answers: [],
  });

  res.json({
    pc_id: pc.pc_id,
    ...turn,
  });
}

export async function handlePreConsultAnswer(req: Request, res: Response) {
  const { pc_id, message, answers } = req.body as {
    pc_id: string;
    message?: string;
    answers: { key: string; answer: string; rephrased?: boolean }[];
  };
  if (!pc_id) throw Errors.badRequest('pc_id is required');

  const patient = await getPatientForUser(req.user!.user_id);
  if (!patient) throw Errors.notFound('Patient record not found');

  const messages: { role: string; text: string }[] = [];
  if (message) {
    messages.push({ role: 'patient', text: message });
  }

  const conversation = await Conversation.findOne({ patient_id: patient.patient_id, status: 'completed' })
    .sort({ updated_at: -1 })
    .lean();

  const turn: PreConsultTurn = await aiPreConsult({
    patient_id: patient.patient_id,
    triage_context: conversation?.triage_result as Record<string, unknown> | undefined,
    patient_context: {
      age: patient.age ?? null,
      gender: patient.gender ?? null,
      existing_conditions: patient.existing_conditions,
    },
    messages,
    answers,
  });

  if (turn.type === 'result' && turn.preconsult_summary) {
    await completePreConsult(pc_id, turn.preconsult_summary, messages, answers);
  } else {
    await savePreConsultAnswers(pc_id, answers, messages);
  }

  res.json(turn);
}

export async function handleGetPreConsult(req: Request, res: Response) {
  const { appointmentId } = req.params;
  if (!appointmentId) throw Errors.badRequest('appointmentId is required');

  const pc = await getPreConsultByAppointment(appointmentId);
  res.json(pc || null);
}
