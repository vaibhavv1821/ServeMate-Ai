import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware.js';
import {
  createProviderProfile,
  getMyProviderProfile,
  updateMyProviderProfile,
  updateProviderServices,
  discoverProviders,
  getProviderById,
  getPendingProviders,
  approveProvider,
  rejectProvider,
  getAllProvidersAdmin,
} from './provider.controller.js';
import { getMatchedProviders } from '../matching/matching.controller.js';

const router = Router();

// ── IMPORTANT: Static routes MUST be declared before /:id wildcard ──

// Smart matching (public)
router.get('/match', getMatchedProviders);

// Admin management routes
router.get('/pending', authenticateToken, authorizeRoles('ADMIN'), getPendingProviders);
router.get('/all', authenticateToken, authorizeRoles('ADMIN'), getAllProvidersAdmin);

// Provider self-service routes
router.post('/profile', authenticateToken, authorizeRoles('PROVIDER'), createProviderProfile);
router.get('/profile/me', authenticateToken, authorizeRoles('PROVIDER'), getMyProviderProfile);
router.put('/profile/me', authenticateToken, authorizeRoles('PROVIDER'), updateMyProviderProfile);
router.put('/services', authenticateToken, authorizeRoles('PROVIDER'), updateProviderServices);

// Public: discover providers (list)
router.get('/', discoverProviders);

// Public: get provider by ID — must be LAST (wildcard)
router.get('/:id', getProviderById);

// Admin verification
router.patch('/:id/approve', authenticateToken, authorizeRoles('ADMIN'), approveProvider);
router.patch('/:id/reject', authenticateToken, authorizeRoles('ADMIN'), rejectProvider);

export default router;
