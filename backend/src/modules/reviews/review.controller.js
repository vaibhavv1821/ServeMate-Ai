/**
 * Review Controller (Phase 3)
 *
 * Business rules:
 *   - Only CUSTOMER can submit a review
 *   - Booking must be COMPLETED
 *   - Customer must own the booking
 *   - One review per booking (enforced by unique constraint)
 *   - Rating: integer 1–5
 *   - Provider averageRating and totalReviews updated atomically
 */

import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';

// ── POST /api/v1/bookings/:id/review ─────────────────────────────
export const createReview = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { id: bookingId } = req.params;
    const { rating, comment } = req.body;

    // Validate rating
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new AppError('Rating must be an integer between 1 and 5', 400);
    }

    // Verify booking
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, customerId },
      include: { provider: { select: { id: true } } },
    });
    if (!booking) throw new AppError('Booking not found or unauthorized', 404);
    if (booking.status !== 'COMPLETED') {
      throw new AppError('Reviews can only be submitted for COMPLETED bookings', 400);
    }

    // Check for duplicate review
    const existing = await prisma.review.findUnique({ where: { bookingId } });
    if (existing) throw new AppError('You have already submitted a review for this booking', 409);

    // Create review and update provider stats in a transaction
    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          bookingId,
          customerId,
          providerId: booking.provider.id,
          rating: ratingNum,
          comment: comment?.trim() || null,
        },
        include: {
          customer: { select: { id: true, name: true } },
        },
      });

      // Recalculate provider stats
      const stats = await tx.review.aggregate({
        where: { providerId: booking.provider.id },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.provider.update({
        where: { id: booking.provider.id },
        data: {
          averageRating: Math.round((stats._avg.rating || 0) * 10) / 10, // 1 decimal
          totalReviews: stats._count.rating,
        },
      });

      return newReview;
    }, { timeout: 30000 });


    res.status(201).json({
      status: 'success',
      message: 'Review submitted successfully.',
      data: { review },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return next(new AppError('You have already submitted a review for this booking', 409));
    }
    next(err);
  }
};

// ── GET /api/v1/providers/:id/reviews ────────────────────────────
export const getProviderReviews = async (req, res, next) => {
  try {
    const { id: providerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total, provider] = await Promise.all([
      prisma.review.findMany({
        where: { providerId },
        include: { customer: { select: { id: true, name: true, profileImage: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.review.count({ where: { providerId } }),
      prisma.provider.findUnique({
        where: { id: providerId },
        select: { averageRating: true, totalReviews: true, completedJobs: true },
      }),
    ]);

    if (!provider) throw new AppError('Provider not found', 404);

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        stats: provider,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/providers/:id/trust ──────────────────────────────
// Transparent trust score (deterministic, not fake AI)
export const getProviderTrustProfile = async (req, res, next) => {
  try {
    const { id: providerId } = req.params;

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: { select: { name: true, createdAt: true } },
        services: { include: { serviceCategory: { select: { name: true } } } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!provider) throw new AppError('Provider not found', 404);

    // Deterministic trust score (0–100)
    let score = 0;
    const factors = [];

    // 1. Verification (30 pts)
    if (provider.verificationStatus === 'APPROVED') {
      score += 30;
      factors.push({ label: 'Identity Verified', points: 30 });
    }

    // 2. Rating (25 pts)
    if (provider.totalReviews > 0) {
      const ratingScore = Math.round(((provider.averageRating - 1) / 4) * 25);
      score += ratingScore;
      factors.push({ label: `Avg Rating ${provider.averageRating}/5 (${provider.totalReviews} reviews)`, points: ratingScore });
    }

    // 3. Completed jobs (25 pts, capped at 100 jobs)
    const jobScore = Math.round(Math.min(provider.completedJobs / 100, 1) * 25);
    score += jobScore;
    factors.push({ label: `${provider.completedJobs} Completed Jobs`, points: jobScore });

    // 4. Experience (20 pts, capped at 10 years)
    const expScore = Math.round(Math.min(provider.experienceYears / 10, 1) * 20);
    score += expScore;
    factors.push({ label: `${provider.experienceYears} Years Experience`, points: expScore });

    res.status(200).json({
      status: 'success',
      data: {
        trustScore: Math.min(score, 100),
        trustLevel: score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
        factors,
        profile: {
          name: provider.user.name,
          verificationStatus: provider.verificationStatus,
          averageRating: provider.averageRating,
          totalReviews: provider.totalReviews,
          completedJobs: provider.completedJobs,
          experienceYears: provider.experienceYears,
          services: provider.services.map((s) => s.serviceCategory.name),
          memberSince: provider.user.createdAt,
          recentReviews: provider.reviews,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
