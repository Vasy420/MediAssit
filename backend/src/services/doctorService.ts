import { Doctor } from '../models/Doctor.js';
import { Appointment } from '../models/Appointment.js';
import { Errors } from '../utils/ApiError.js';
import { addDaysIso, toDisplayTime, todayIso, weekdayName } from '../utils/time.js';

export async function getDoctorForUser(userId: string) {
  const doctor = await Doctor.findOne({ user_id: userId }).lean();
  if (!doctor) throw Errors.notFound('Doctor record not found');
  return doctor;
}

export async function listDoctors(specialty?: string) {
  const query = specialty ? { specialization: specialty } : {};
  return Doctor.find(query).select('-__v').sort({ rating: -1 }).lean();
}

export async function getDoctor(doctorId: string) {
  const doctor = await Doctor.findOne({ doctor_id: doctorId }).select('-__v').lean();
  if (!doctor) throw Errors.notFound('Doctor not found');
  return doctor;
}

export async function getAvailability(doctorId: string, requestedDate?: string) {
  const doctor = await getDoctor(doctorId);
  const date =
    requestedDate && !Number.isNaN(Date.parse(requestedDate + 'T00:00:00'))
      ? requestedDate
      : addDaysIso(0);
  const dayName = weekdayName(date);
  const row = doctor.availability?.find((a) => a.day === dayName);
  const rawSlots = row?.slots ?? [];

  const booked = await Appointment.find({
    doctor_id: doctorId,
    date,
    status: { $nin: ['cancelled', 'no_show'] },
  })
    .select('time')
    .lean();
  const bookedSet = new Set(booked.map((b) => b.time));

  const isToday = date === todayIso();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const slots = rawSlots
    .map((slot) => toDisplayTime(slot))
    .filter((slot) => !bookedSet.has(slot))
    .filter((slot) => {
      if (!isToday) return true;
      const [hRaw, mRaw] = slot.split(':');
      const h = parseInt(hRaw, 10);
      const m = parseInt(mRaw ?? '0', 10);
      const period = slot.includes('PM') && h < 12 ? 12 : 0;
      return h * 60 + m + period > nowMin + 30;
    });

  return { doctor, date, day: dayName, slots, isToday };
}