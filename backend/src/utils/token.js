import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'servmate_super_secret_jwt_key_placement_ready_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Sign a JWT token containing user ID and Role payload
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify JWT token and decode payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
