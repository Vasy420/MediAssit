import { Request, Response } from 'express';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { Appointment } from '../models/Appointment.js';
import { Queue } from '../models/Queue.js';
import { MedicalReport } from '../models/MedicalReport.js';
import { PreConsultation } from '../models/PreConsultation.js';
import { DoctorNote } from '../models/DoctorNote.js';
import { Conversation } from '../models/Conversation.js';
import { getDoctorForUser } from '../services/doctorService.js';
import { nextId } from '../utils/idGen.js';
import { Errors } from '../utils/ApiError.js';

export async function handleDoctorDashboard(req: Request, res: Response) {
  const doctor = await getDoctorForUser(req.user!.user_id);
  if (!doctor) throw Errors.notFound('Doctor record not found');

  const today = new Date().toISOString().split('T')[0];

  const appointments = await Appointment.find({
    doctor_id: doctor.doctor_id,
    date: today,
    status: { $in: ['confirmed', 'in_queue', 'in_consultation'] },
  })
    .sort({ time: 1 })
    .lean();

  const patientIds = appointments.map((a) => a.patient_id);
  const patients = await Patient.find({ patient_id: { $in: patientIds } }).lean();
  const patientMap = new Map(patients.map((p) => [p.patient_id, p]));

  const queueEntries = await Queue.find({
    doctor_id: doctor.doctor_id,
    status: { $in: ['waiting', 'called', 'in_consultation'] },
  })
    .sort({ priority_score: -1, created_at: 1 })
    .lean();

  const urgencyBreakdown = { red: 0, orange: 0, yellow: 0, green: 0 };
  for (const q of queueEntries) {
    const key = q.urgency as keyof typeof urgencyBreakdown;
    if (urgencyBreakdown[key] !== undefined) urgencyBreakdown[key]++;
  }

  const appointmentViews = appointments.map((a) => {
    const p = patientMap.get(a.patient_id);
    const queue = queueEntries.find((q) => q.appointment_id === a.appointment_id);
    return {
      appointment_id: a.appointment_id,
      patient_id: a.patient_id,
      patient_name: p?.name ?? 'Unknown',
      time: a.time,
      urgency: a.urgency,
      status: a.status,
      queue_position: queue?.queue_token ?? null,
      queue_status: queue?.status ?? null,
    };
  });

  res.json({
    doctor_id: doctor.doctor_id,
    doctor_name: doctor.name,
    specialization: doctor.specialization,
    today_appointments: appointmentViews,
    total_today: appointments.length,
    queue_length: queueEntries.length,
    urgency_breakdown: urgencyBreakdown,
  });
}

export async function handlePatientSummary(req: Request, res: Response) {
  const { patientId } = req.params;
  if (!patientId) throw Errors.badRequest('patientId is required');

  const patient = await Patient.findOne({ patient_id: patientId }).lean();
  if (!patient) throw Errors.notFound('Patient not found');

  const preConsult = await PreConsultation.findOne({
    patient_id: patientId,
    status: 'completed',
  })
    .sort({ created_at: -1 })
    .lean();

  const conversation = await Conversation.findOne({
    patient_id: patientId,
    status: 'completed',
  })
    .sort({ updated_at: -1 })
    .lean();

  const reports = await MedicalReport.find({ patient_id: patientId })
    .sort({ created_at: -1 })
    .limit(5)
    .lean();

  const pastAppointments = await Appointment.find({ patient_id: patientId })
    .sort({ date: -1, time: -1 })
    .limit(5)
    .lean();

  res.json({
    patient: {
      patient_id: patient.patient_id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      blood_group: patient.blood_group,
      existing_conditions: patient.existing_conditions,
      allergies: patient.allergies,
      medical_history: patient.medical_history,
      emergency_contact: patient.emergency_contact,
    },
    preconsult_summary: preConsult
      ? {
          chief_complaint: preConsult.chief_complaint,
          symptoms: preConsult.symptoms,
          medications: preConsult.medications,
          allergies: preConsult.allergies,
          medical_history: preConsult.medical_history,
          lifestyle_notes: preConsult.lifestyle_notes,
          vital_signs: preConsult.vital_signs,
          triage_context: preConsult.triage_context,
        }
      : null,
    triage_result: conversation?.triage_result ?? null,
    urgency: conversation?.urgency ?? '',
    recent_reports: reports.map((r) => ({
      report_id: r.report_id,
      diagnosis: r.doctor_diagnosis,
      date: r.created_at,
    })),
    recent_appointments: pastAppointments.map((a) => ({
      appointment_id: a.appointment_id,
      date: a.date,
      time: a.time,
      reason: a.reason,
      status: a.status,
    })),
  });
}

export async function handleCreateNote(req: Request, res: Response) {
  const { queueId } = req.params;
  const { content } = req.body as { content: string };
  if (!content) throw Errors.badRequest('content is required');

  const doctor = await getDoctorForUser(req.user!.user_id);
  if (!doctor) throw Errors.notFound('Doctor record not found');

  const queueEntry = await Queue.findOne({ queue_id: queueId }).lean();
  if (!queueEntry) throw Errors.notFound('Queue entry not found');

  const noteId = await nextId('DN', 3);
  const note = await DoctorNote.create({
    note_id: noteId,
    doctor_id: doctor.doctor_id,
    queue_id: queueId,
    patient_id: queueEntry.patient_id,
    content,
  });

  res.status(201).json(note);
}

export async function handleGetNotes(req: Request, res: Response) {
  const { queueId } = req.params;

  const notes = await DoctorNote.find({ queue_id: queueId })
    .sort({ created_at: -1 })
    .lean();

  res.json(notes);
}
