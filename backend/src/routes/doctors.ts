import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  handleAvailability,
  handleGetDoctor,
  handleListDoctors,
} from '../controllers/doctorController.js';

export const doctorRouter = Router();

doctorRouter.use(requireAuth);
doctorRouter.get('/', handleListDoctors);
doctorRouter.get('/:id/availability', handleAvailability);
doctorRouter.get('/:id', handleGetDoctor);