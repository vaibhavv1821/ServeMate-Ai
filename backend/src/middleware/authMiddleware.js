import { verifyToken } from '../utils/token.js';
import prisma from '../config/prisma.js';

/**
 * Authentication Middleware: Verifies Bearer JWT Token and attaches req.user
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication token required in Authorization header (Bearer <token>)',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Malformed authorization token',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication token has expired. Please login again.',
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authorization token',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profileImage: true,
        city: true,
        state: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User account associated with token no longer exists',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'User account is deactivated. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role Authorization Middleware: Enforces role permissions for endpoints
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthenticated user',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: Access restricted to roles [${roles.join(', ')}]. User has role '${req.user.role}'.`,
      });
    }

    next();
  };
};
