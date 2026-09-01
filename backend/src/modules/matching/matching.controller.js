import prisma from '../../config/prisma.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { AppError } from '../../utils/AppError.js';
import { matchProviders } from './matching.service.js';
import { matchingQuerySchema } from '../../validators/phase2Validators.js';

/**
 * GET /api/v1/providers/match
 * Public: Smart provider matching with weighted ranking
 *
 * Query params: serviceCategoryId, city, latitude, longitude, dayOfWeek, startTime
 */
export const getMatchedProviders = catchAsync(async (req, res) => {
  const parsed = matchingQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

  const criteria = parsed.data;

  // Build provider filter: only APPROVED providers
  const where = {
    verificationStatus: 'APPROVED',
    ...(criteria.city && { city: { contains: criteria.city, mode: 'insensitive' } }),
    ...(criteria.serviceCategoryId && {
      services: { some: { serviceCategoryId: criteria.serviceCategoryId } },
    }),
  };

  const providers = await prisma.provider.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, profileImage: true } },
      services: { include: { serviceCategory: { select: { id: true, name: true, slug: true } } } },
      availability: { where: { isBooked: false }, orderBy: { startTime: 'asc' } },
    },
    take: 50, // cap before scoring
  });

  const results = matchProviders(providers, criteria);

  res.status(200).json({
    status: 'success',
    results: results.length,
    algorithm: {
      weights: { service: '30%', distance: '20%', availability: '20%', rating: '15%', experience: '10%', price: '5%' },
      distanceFormula: 'Haversine (great-circle), fallback: city name match',
    },
    data: { matches: results },
  });
});
