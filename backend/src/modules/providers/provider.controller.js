import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { createProviderProfileSchema, updateProviderServicesSchema, providerDiscoveryQuerySchema } from '../../validators/phase2Validators.js';

/**
 * POST /api/v1/providers/profile
 * Provider: Create their provider profile (one-time)
 */
export const createProviderProfile = catchAsync(async (req, res) => {
  const user = req.user;
  if (user.role !== 'PROVIDER') throw new AppError('Only PROVIDER accounts can create a provider profile', 403);

  // Check for existing profile
  const existing = await prisma.provider.findUnique({ where: { userId: user.id } });
  if (existing) throw new AppError('You already have a provider profile. Use PUT to update it.', 409);

  const parsed = createProviderProfileSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

  const provider = await prisma.provider.create({
    data: {
      userId: user.id,
      ...parsed.data,
      city: parsed.data.city || user.city || null,
      state: parsed.data.state || user.state || null,
      verificationStatus: 'PENDING',
    },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });

  res.status(201).json({ status: 'success', message: 'Provider profile created. Pending admin verification.', data: { provider } });
});

/**
 * GET /api/v1/providers/profile/me
 * Provider: Get their own full profile
 */
export const getMyProviderProfile = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({
    where: { userId: req.user.id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, profileImage: true } },
      services: { include: { serviceCategory: { select: { id: true, name: true, slug: true, iconName: true } } } },
      availability: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
  });

  if (!provider) throw new AppError('Provider profile not found. Please create one.', 404);

  res.status(200).json({ status: 'success', data: { provider } });
});

/**
 * PUT /api/v1/providers/profile/me
 * Provider: Update their own profile
 */
export const updateMyProviderProfile = catchAsync(async (req, res) => {
  const existing = await prisma.provider.findUnique({ where: { userId: req.user.id } });
  if (!existing) throw new AppError('Provider profile not found. Create one first.', 404);

  const parsed = createProviderProfileSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

  const provider = await prisma.provider.update({
    where: { userId: req.user.id },
    data: parsed.data,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  res.status(200).json({ status: 'success', data: { provider } });
});

/**
 * PUT /api/v1/providers/services
 * Provider: Set their service categories (replaces existing)
 */
export const updateProviderServices = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError('Create your provider profile first', 404);

  const parsed = updateProviderServicesSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

  const { serviceCategoryIds } = parsed.data;

  // Validate all provided category IDs exist
  const categories = await prisma.serviceCategory.findMany({
    where: { id: { in: serviceCategoryIds }, isActive: true },
  });
  if (categories.length !== serviceCategoryIds.length) throw new AppError('One or more service categories not found or inactive', 400);

  // Replace all provider services atomically
  await prisma.$transaction([
    prisma.providerService.deleteMany({ where: { providerId: provider.id } }),
    prisma.providerService.createMany({
      data: serviceCategoryIds.map((id) => ({ providerId: provider.id, serviceCategoryId: id })),
      skipDuplicates: true,
    }),
  ]);

  const updated = await prisma.providerService.findMany({
    where: { providerId: provider.id },
    include: { serviceCategory: { select: { id: true, name: true, slug: true } } },
  });

  res.status(200).json({ status: 'success', data: { services: updated.map((ps) => ps.serviceCategory) } });
});

/**
 * GET /api/v1/providers
 * Public: Discover approved providers with filters
 */
export const discoverProviders = catchAsync(async (req, res) => {
  const parsed = providerDiscoveryQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

  const { service, city, minRating, maxPrice, minExperience, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    verificationStatus: 'APPROVED',
    ...(city && { city: { contains: city, mode: 'insensitive' } }),
    ...(minRating !== undefined && { averageRating: { gte: minRating } }),
    ...(maxPrice !== undefined && { hourlyRate: { lte: maxPrice } }),
    ...(minExperience !== undefined && { experienceYears: { gte: minExperience } }),
    ...(service && {
      services: {
        some: {
          serviceCategory: {
            OR: [
              { slug: { contains: service, mode: 'insensitive' } },
              { name: { contains: service, mode: 'insensitive' } },
            ],
          },
        },
      },
    }),
  };

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ averageRating: 'desc' }, { completedJobs: 'desc' }],
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        services: { include: { serviceCategory: { select: { id: true, name: true, slug: true, iconName: true } } } },
      },
    }),
    prisma.provider.count({ where }),
  ]);

  res.status(200).json({
    status: 'success',
    results: providers.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    data: { providers },
  });
});

/**
 * GET /api/v1/providers/:id
 * Public: Get a single approved provider by id
 */
export const getProviderById = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findFirst({
    where: { id: req.params.id, verificationStatus: 'APPROVED' },
    include: {
      user: { select: { id: true, name: true, profileImage: true, phone: true } },
      services: { include: { serviceCategory: { select: { id: true, name: true, slug: true, iconName: true } } } },
      availability: {
        where: { isBooked: false },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!provider) throw new AppError('Provider not found or not yet approved', 404);

  res.status(200).json({ status: 'success', data: { provider } });
});

// ==========================================
// ADMIN VERIFICATION ENDPOINTS
// ==========================================

/**
 * GET /api/v1/providers/pending
 * Admin: List all pending provider profiles
 */
export const getPendingProviders = catchAsync(async (req, res) => {
  const providers = await prisma.provider.findMany({
    where: { verificationStatus: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      services: { include: { serviceCategory: { select: { name: true } } } },
    },
  });

  res.status(200).json({ status: 'success', results: providers.length, data: { providers } });
});

/**
 * PATCH /api/v1/providers/:id/approve
 * Admin: Approve a provider profile
 */
export const approveProvider = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!provider) throw new AppError('Provider not found', 404);
  if (provider.verificationStatus === 'APPROVED') throw new AppError('Provider is already approved', 400);

  const updated = await prisma.provider.update({
    where: { id: req.params.id },
    data: { verificationStatus: 'APPROVED' },
    include: { user: { select: { name: true, email: true } } },
  });

  res.status(200).json({ status: 'success', message: 'Provider approved successfully', data: { provider: updated } });
});

/**
 * PATCH /api/v1/providers/:id/reject
 * Admin: Reject a provider profile
 */
export const rejectProvider = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!provider) throw new AppError('Provider not found', 404);

  const updated = await prisma.provider.update({
    where: { id: req.params.id },
    data: { verificationStatus: 'REJECTED' },
    include: { user: { select: { name: true, email: true } } },
  });

  res.status(200).json({ status: 'success', message: 'Provider rejected', data: { provider: updated } });
});

/**
 * GET /api/v1/providers/all
 * Admin: List all providers with status
 */
export const getAllProvidersAdmin = catchAsync(async (req, res) => {
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      services: { include: { serviceCategory: { select: { name: true } } } },
    },
  });

  res.status(200).json({ status: 'success', results: providers.length, data: { providers } });
});
