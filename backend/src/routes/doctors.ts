import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  handleAvailability,
  handleGetDoctor,
  handleGetMyDoctor,
  handleListDoctors,
  handleUpdateMyDoctor,
} from '../controllers/doctorController.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';

export const doctorRouter = Router();

doctorRouter.use(requireAuth);
doctorRouter.get('/', handleListDoctors);
doctorRouter.get('/me', handleGetMyDoctor);
doctorRouter.patch(
  '/me',
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('hospital').trim().notEmpty().withMessage('Hospital or clinic is required'),
  body('qualification').optional().trim(),
  body('experience').optional().isInt({ min: 0, max: 80 }),
  body('consultation_fee').optional().isFloat({ min: 0 }),
  body('room_number').optional().trim(),
  body('availability').optional().isArray().withMessage('Availability must be an array'),
  body('status').optional().isIn(['available', 'busy', 'offline']),
  validate,
  handleUpdateMyDoctor,
);
doctorRouter.get('/:id/availability', handleAvailability);
doctorRouter.get('/:id', handleGetDoctor);
