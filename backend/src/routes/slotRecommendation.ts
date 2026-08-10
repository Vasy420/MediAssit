import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiRecommendSlots } from '../services/aiClient.js';
import { listDoctors, getAvailability } from '../services/doctorService.js';
import { listDoctorQueue, AVG_CONSULT_MINUTES } from '../services/queueAgent.js';

export const slotRouter = Router();

slotRouter.use(requireAuth);

slotRouter.post('/recommend', async (req: Request, res: Response) => {
  const { urgency, recommended_specialties } = req.body as {
    urgency?: string;
    recommended_specialties?: { name: string; score: number }[];
  };

  const doctors = await listDoctors();
  const slots: {
    doctor_id: string;
    doctor_name: string;
    specialization: string;
    date: string;
    time: string;
    consultation_fee: number;
    rating: number;
    estimated_wait_minutes: number;
  }[] = [];

  const today = new Date().toISOString().split('T')[0];

  for (const doctor of doctors.slice(0, 10)) {
    try {
      const avail = await getAvailability(doctor.doctor_id, today);
      if (avail.slots.length === 0) continue;

      const queue = await listDoctorQueue(doctor.doctor_id);
      const waitMinutes = queue.length * AVG_CONSULT_MINUTES;

      for (const time of avail.slots.slice(0, 3)) {
        slots.push({
          doctor_id: doctor.doctor_id,
          doctor_name: doctor.name,
          specialization: doctor.specialization,
          date: today,
          time,
          consultation_fee: doctor.consultation_fee,
          rating: doctor.rating,
          estimated_wait_minutes: waitMinutes,
        });
      }
    } catch {
      continue;
    }
  }

  try {
    const result = await aiRecommendSlots({
      urgency: urgency || 'green',
      recommended_specialties: recommended_specialties || [],
      available_slots: slots,
    });
    res.json(result);
  } catch {
    res.json({ recommendations: slots.slice(0, 5), fallback: true });
  }
});
