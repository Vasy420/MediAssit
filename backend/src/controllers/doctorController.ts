import { Request, Response } from 'express';
import { listDoctors, getDoctor, getAvailability } from '../services/doctorService.js';

export async function handleListDoctors(req: Request, res: Response) {
  const specialty = (req.query.specialty as string) || undefined;
  const doctors = await listDoctors(specialty);
  res.json({ success: true, data: doctors });
}

export async function handleGetDoctor(req: Request, res: Response) {
  const doctor = await getDoctor(String(req.params.id));
  res.json({ success: true, data: doctor });
}

export async function handleAvailability(req: Request, res: Response) {
  const date = req.query.date as string | undefined;
  const availability = await getAvailability(String(req.params.id), date);
  res.json({ success: true, data: availability });
}