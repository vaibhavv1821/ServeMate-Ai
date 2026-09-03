/**
 * AI Controller (Phase 4)
 *
 * Endpoint: POST /api/v1/ai/analyze-service
 *
 * Requirements:
 * - JWT authentication required.
 * - Rate limited: max 5 requests per user per minute via Redis.
 * - Validates input description.
 * - Maps to existing active database ServiceCategories.
 * - Attaches standard disclaimer: "AI-assisted recommendation, not a professional diagnosis."
 */

import prisma from '../../config/prisma.js';
import { getRedis } from '../../config/redis.js';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { analyzeServiceSchema } from './ai.validators.js';
import { analyzeServiceWithAI } from './ai.service.js';

const AI_RATE_LIMIT_WINDOW_SECONDS = 60;
const AI_RATE_LIMIT_MAX = 5;

export const analyzeService = catchAsync(async (req, res) => {
  // 1. Validate input
  const parsed = analyzeServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0].message, 400);
  }

  const { description } = parsed.data;
  const userId = req.user.id;

  // 2. Redis Rate Limiting (cost control)
  try {
    const redis = getRedis();
    const rateLimitKey = `rate_limit:ai_analyze:${userId}`;
    const currentCount = await redis.incr(rateLimitKey);
    if (currentCount === 1) {
      await redis.expire(rateLimitKey, AI_RATE_LIMIT_WINDOW_SECONDS);
    }
    if (currentCount > AI_RATE_LIMIT_MAX) {
      throw new AppError(
        'Too many AI analysis requests. Please wait a minute before requesting another analysis.',
        429
      );
    }
  } catch (err) {
    if (err.statusCode === 429) throw err;
    // If Redis is temporarily degraded, log and proceed safely without blocking customer
    console.warn('[AI Controller] Redis rate limiter warning:', err.message);
  }

  // 3. Fetch active service categories from database (source of truth)
  const activeCategories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, description: true },
  });

  if (!activeCategories.length) {
    throw new AppError('No active service categories found in marketplace', 503);
  }

  // 4. Perform AI Analysis
  const aiResult = await analyzeServiceWithAI(description, activeCategories);

  // 5. Match category ID from database
  const matchingDbCategory = activeCategories.find(
    (c) => c.name.toLowerCase() === aiResult.category.toLowerCase()
  ) || activeCategories[0];

  res.status(200).json({
    status: 'success',
    data: {
      category: matchingDbCategory.name,
      serviceCategoryId: matchingDbCategory.id,
      categorySlug: matchingDbCategory.slug,
      issue: aiResult.issue,
      urgency: aiResult.urgency,
      suggestedDescription: aiResult.suggestedDescription,
      confidence: aiResult.confidence,
      isFallback: aiResult.isFallback,
      disclaimer: 'This is an AI-assisted recommendation, not a professional diagnosis. For dangerous situations involving gas leaks, severe flooding, or electrical fires, immediately disconnect utilities and contact emergency services.',
    },
  });
});
