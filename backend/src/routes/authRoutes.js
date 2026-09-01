import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { validateBody } from '../middlewares/validate.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

// Protected Authentication Profile Endpoint
router.get('/me', authenticateToken, getMe);

// Development / Placement Verification Protected Endpoints
// NOTE: These test routes verify role authorization middleware.
// Recommendation: Remove or restrict these endpoints before deploying to production.
router.get('/test/customer', authenticateToken, authorizeRoles('CUSTOMER'), (req, res) => {
  res.json({
    status: 'success',
    message: 'Customer verification access granted',
    user: req.user,
  });
});

router.get('/test/provider', authenticateToken, authorizeRoles('PROVIDER'), (req, res) => {
  res.json({
    status: 'success',
    message: 'Provider verification access granted',
    user: req.user,
  });
});

router.get('/test/admin', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  res.json({
    status: 'success',
    message: 'Admin verification access granted',
    user: req.user,
  });
});

export default router;
