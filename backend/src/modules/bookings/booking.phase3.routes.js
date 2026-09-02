import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware.js';
import { generateOTP, verifyOTP } from '../verification/verification.controller.js';
import { uploadProof, getProofs } from '../proofs/proof.controller.js';
import { createReview } from '../reviews/review.controller.js';
import { handleUpload } from '../../middleware/upload.js';

const router = Router();

// OTP endpoints (mounted under /api/v1/bookings/:id/...)
router.post('/:id/otp/generate', authenticateToken, authorizeRoles('CUSTOMER'), generateOTP);
router.post('/:id/otp/verify',   authenticateToken, authorizeRoles('PROVIDER'),  verifyOTP);

// Proof endpoints
router.post('/:id/proof', authenticateToken, handleUpload, uploadProof);
router.get('/:id/proof',  authenticateToken, getProofs);

// Review endpoint
router.post('/:id/review', authenticateToken, authorizeRoles('CUSTOMER'), createReview);

export default router;
