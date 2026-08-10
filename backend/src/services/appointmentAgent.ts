import { Doctor } from '../models/Doctor.js';
import { Appointment } from '../models/Appointment.js';
import { Errors } from '../utils/ApiError.js';
import { nextId } from '../utils/idGen.js';
import { weekdayName } from '../utils/time.js';
import { getAvailability } from './doctorService.js';

export interface BookAppointmentInput {
  patient_id: string;
  doctor_id: string;
  date: string;
  time: string;
  hospital?: string;
  reason?: string;
  urgency?: 'green' | 'yellow' | 'orange' | 'red';
}

export async function bookAppointment(input: BookAppointmentInput) {
  const doctor = await Doctor.findOne({ doctor_id: input.doctor_id }).lean();
  if (!doctor) throw Errors.notFound('Doctor not found');

  const av = await getAvailability(input.doctor_id, input.date);
  if (!av.slots.includes(input.time)) {
    throw Errors.conflict('This time slot is not available. Please choose another slot.', {
      available: av.slots,
    });
  }

  const existing = await Appointment.findOne({
    doctor_id: input.doctor_id,
    date: av.date,
    time: input.time,
    status: { $nin: ['cancelled', 'no_show'] },
  }).lean();
  if (existing) throw Errors.conflict('This time slot was just booked by someone else.');

  const appointment_id = await nextId('A');
  const appointment = await Appointment.create({
    appointment_id,
    patient_id: input.patient_id,
    doctor_id: input.doctor_id,
    date: av.date,
    time: input.time,
    hospital: input.hospital ?? '',
    reason: input.reason ?? '',
    urgency: input.urgency ?? 'green',
    status: 'scheduled',
  });

  void weekdayName;
  return { appointment, doctor };
}

export async function getPatientAppointments(patientId: string) {
  const list = await Appointment.find({ patient_id: patientId })
    .sort({ date: -1, time: -1 })
    .lean();
  const doctorIds = [...new Set(list.map((a) => a.doctor_id))];
  const doctors = await Doctor.find({ doctor_id: { $in: doctorIds } })
    .select('doctor_id name specialization department')
    .lean();
  const map = new Map(doctors.map((d) => [d.doctor_id, d]));
  return list.map((a) => ({ ...a, doctor: map.get(a.doctor_id) ?? null }));
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const statuses = ['scheduled', 'confirmed', 'in_queue', 'in_consultation', 'completed', 'cancelled', 'no_show'];
  if (!statuses.includes(status)) throw Errors.badRequest('Invalid appointment status');
  const appointment = await Appointment.findOne({ appointment_id: appointmentId }).lean();
  if (!appointment) throw Errors.notFound('Appointment not found');
  await Appointment.updateOne({ appointment_id: appointmentId }, { status });
  return Appointment.findOne({ appointment_id: appointmentId }).lean();
}
