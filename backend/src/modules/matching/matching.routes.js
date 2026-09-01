import { Router } from 'express';
import { getMatchedProviders } from './matching.controller.js';

const router = Router();

// Public: no auth required for matching
router.get('/', getMatchedProviders);

export default router;
