import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {
  getProviderReviews,
  getProviderTrustProfile,
} from '../reviews/review.controller.js';

const router = Router();

// These are added to the provider router (mounted at /api/v1/providers)
router.get('/:id/reviews', getProviderReviews);
router.get('/:id/trust',   authenticateToken, getProviderTrustProfile);

export default router;
