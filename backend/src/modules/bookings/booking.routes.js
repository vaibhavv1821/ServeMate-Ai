import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware.js';
import {
  createBooking,
  getMyBookings,
  getProviderBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  completeBooking,
  getBackupCandidates,
  reassignBackupProvider,
} from './booking.controller.js';

const router = Router();

// All booking routes require authentication
router.use(authenticateToken);

// Customer routes
router.post('/', authorizeRoles('CUSTOMER'), createBooking);
router.get('/my', authorizeRoles('CUSTOMER'), getMyBookings);
router.patch('/:id/cancel', authorizeRoles('CUSTOMER'), cancelBooking);

// Backup Provider routes (Phase 4)
router.get('/:id/backup-candidates', authorizeRoles('CUSTOMER', 'ADMIN'), getBackupCandidates);
router.post('/:id/reassign-backup', authorizeRoles('CUSTOMER', 'ADMIN'), reassignBackupProvider);

// Provider routes
router.get('/provider', authorizeRoles('PROVIDER'), getProviderBookings);
router.patch('/:id/accept', authorizeRoles('PROVIDER'), acceptBooking);
router.patch('/:id/reject', authorizeRoles('PROVIDER'), rejectBooking);
router.patch('/:id/complete', authorizeRoles('PROVIDER', 'ADMIN'), completeBooking);

// Shared: customer, provider owner, or admin can view
router.get('/:id', getBookingById);

export default router;

