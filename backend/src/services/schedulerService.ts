import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { notify } from './notificationService.js';
import { getDoctor } from './doctorService.js';
import { logger } from '../utils/logger.js';

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function sendDueReminders(): Promise<number> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const appointments = await Appointment.find({
    date: tomorrowStr,
    status: { $in: ['confirmed', 'scheduled', 'in_queue'] },
    reminder_sent_at: { $exists: false },
  }).lean();

  let sent = 0;
  for (const appt of appointments) {
    try {
      const doctor = await getDoctor(appt.doctor_id);
      const patient = await Patient.findOne({ patient_id: appt.patient_id }).lean();
      if (patient?.user_id) {
        await notify.appointmentReminder(
          patient.user_id,
          appt.appointment_id,
          doctor.name,
          appt.date,
          appt.time,
        );
        await Appointment.updateOne(
          { appointment_id: appt.appointment_id, reminder_sent_at: { $exists: false } },
          { $set: { reminder_sent_at: new Date() } },
        );
        sent += 1;
      }
    } catch (err) {
      logger.warn('Failed to send reminder for appointment ' + appt.appointment_id);
      void err;
    }
  }
  return sent;
}

export function startScheduler(intervalMinutes = 30) {
  if (intervalId) return;

  intervalId = setInterval(() => {
    void sendDueReminders().catch((err) => {
      logger.warn('Scheduler error: ' + (err as Error).message);
    });
  }, intervalMinutes * 60 * 1000);

  logger.info('Scheduler started (interval: ' + intervalMinutes + ' min)');
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
