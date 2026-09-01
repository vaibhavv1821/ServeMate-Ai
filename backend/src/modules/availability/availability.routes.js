import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware.js';
import {
  createAvailability,
  getMyAvailability,
  deleteAvailability,
  getProviderAvailability,
} from './availability.controller.js';

const router = Router();

// Provider: manage own slots
router.post('/', authenticateToken, authorizeRoles('PROVIDER'), createAvailability);
router.get('/my', authenticateToken, authorizeRoles('PROVIDER'), getMyAvailability);
router.delete('/:id', authenticateToken, authorizeRoles('PROVIDER'), deleteAvailability);

// Public: view provider availability
router.get('/provider/:providerId', getProviderAvailability);

export default router;
