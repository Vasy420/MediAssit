import { Router } from 'express';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import {
  handleDoctorDashboard,
  handlePatientSummary,
  handlePatientHistory,
  handleCreateNote,
  handleGetNotes,
  handleConsultation,
} from '../controllers/doctorDashboardController.js';

export const doctorDashboardRouter = Router();

doctorDashboardRouter.use(requireAuth);
doctorDashboardRouter.use(requireRoles('doctor', 'admin'));

doctorDashboardRouter.get('/dashboard', handleDoctorDashboard);
doctorDashboardRouter.get('/patients', handlePatientHistory);
doctorDashboardRouter.get('/consultation/:appointmentId', handleConsultation);
doctorDashboardRouter.get('/patient-summary/:patientId', handlePatientSummary);
doctorDashboardRouter.post('/notes', handleCreateNote);
doctorDashboardRouter.get('/notes', handleGetNotes);
doctorDashboardRouter.post('/notes/:queueId', handleCreateNote);
doctorDashboardRouter.get('/notes/:queueId', handleGetNotes);
