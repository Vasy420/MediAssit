import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import {
  handleDoctorDashboard,
  handlePatientSummary,
  handlePatientHistory,
  handleCreateNote,
  handleGetNotes,
} from '../controllers/doctorDashboardController.js';

export const doctorDashboardRouter = Router();

doctorDashboardRouter.use(requireAuth);
doctorDashboardRouter.use(requireRoles('doctor', 'admin'));

doctorDashboardRouter.get('/dashboard', handleDoctorDashboard);
doctorDashboardRouter.get('/patients', handlePatientHistory);
doctorDashboardRouter.get('/patient-summary/:patientId', handlePatientSummary);
doctorDashboardRouter.post('/notes/:queueId', handleCreateNote);
doctorDashboardRouter.get('/notes/:queueId', handleGetNotes);
