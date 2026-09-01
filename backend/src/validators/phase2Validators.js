import { z } from 'zod';

// Time format: "HH:MM"
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createProviderProfileSchema = z.object({
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(1000).optional(),
  experienceYears: z.number().int().min(0).max(50).optional(),
  hourlyRate: z.number().min(0).max(100000).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateProviderServicesSchema = z.object({
  serviceCategoryIds: z
    .array(z.string().uuid('Each service must be a valid ID'))
    .min(1, 'Select at least one service category'),
});

export const providerDiscoveryQuerySchema = z.object({
  service: z.string().optional(),
  city: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minExperience: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const createAvailabilitySchema = z.object({
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:MM format'),
}).refine((data) => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const createBookingSchema = z.object({
  providerId: z.string().uuid('Provider ID must be a valid UUID'),
  serviceCategoryId: z.string().uuid('Service category ID must be a valid UUID'),
  availabilityId: z.string().uuid('Availability ID must be a valid UUID').optional(),
  bookingDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'bookingDate must be a valid ISO date'),
  startTime: z.string().regex(timeRegex, 'startTime must be in HH:MM format'),
  endTime: z.string().regex(timeRegex, 'endTime must be in HH:MM format'),
  serviceAddress: z.string().min(5, 'Service address is required').max(500),
  city: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  estimatedPrice: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const matchingQuerySchema = z.object({
  serviceCategoryId: z.string().uuid('serviceCategoryId must be a valid UUID').optional(),
  city: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']).optional(),
  startTime: z.string().regex(timeRegex).optional(),
});
