import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { analyzeService } from './ai.controller.js';

const router = Router();

// Authentication required for AI analysis
router.use(authenticateToken);

// POST /api/v1/ai/analyze-service
router.post('/analyze-service', analyzeService);

export default router;
