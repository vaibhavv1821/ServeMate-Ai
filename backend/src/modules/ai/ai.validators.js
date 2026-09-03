import { z } from 'zod';

export const analyzeServiceSchema = z.object({
  description: z
    .string({ required_error: 'Service issue description is required' })
    .trim()
    .min(5, 'Description must be at least 5 characters long')
    .max(1000, 'Description cannot exceed 1000 characters'),
});

export const aiOutputSchema = z.object({
  category: z.string().min(1),
  issue: z.string().min(1),
  urgency: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']),
  suggestedDescription: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
