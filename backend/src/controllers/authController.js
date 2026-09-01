import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { generateToken } from '../utils/token.js';

/**
 * Register User (CUSTOMER or PROVIDER)
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, city, state } = req.body;

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email address already exists',
      });
    }

    // Hash password with bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in Neon PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: role || 'CUSTOMER',
        city: city || null,
        state: state || null,
      },
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

    // Generate JWT token
    const token = generateToken({ id: newUser.id, role: newUser.role });

    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        token,
        user: newUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login User
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Generic error message for security (prevents user enumeration)
    const invalidAuthResponse = () =>
      res.status(401).json({
        status: 'error',
        message: 'Invalid email address or password',
      });

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return invalidAuthResponse();
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'User account is deactivated. Please contact support.',
      });
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return invalidAuthResponse();
    }

    // Generate JWT
    const token = generateToken({ id: user.id, role: user.role });

    // Safe user payload omitting password
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      city: user.city,
      state: user.state,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      status: 'success',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};
