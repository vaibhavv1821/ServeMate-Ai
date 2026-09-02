import { Router } from 'express';
import { searchLocation, reverseGeocode } from './location.controller.js';

const router = Router();

router.get('/search', searchLocation);
router.get('/reverse', reverseGeocode);

export default router;
