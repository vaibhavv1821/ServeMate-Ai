import { Router } from 'express';
import { getAllServices, getServiceById } from './serviceCategory.controller.js';

const router = Router();

// Public routes - no authentication required
router.get('/', getAllServices);
router.get('/:id', getServiceById);

export default router;
