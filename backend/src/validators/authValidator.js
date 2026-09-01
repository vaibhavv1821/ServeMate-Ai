import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .regex(/^[0-9+\s-]{8,15}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  role: z
    .enum(['CUSTOMER', 'PROVIDER'], {
      errorMap: () => ({ message: 'Public registration allows only CUSTOMER or PROVIDER role' }),
    })
    .default('CUSTOMER'),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});
