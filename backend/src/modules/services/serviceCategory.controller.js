import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';

/**
 * GET /api/v1/services
 * Public: Returns all active service categories
 */
export const getAllServices = catchAsync(async (req, res) => {
  const services = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      iconName: true,
    },
  });

  res.status(200).json({
    status: 'success',
    results: services.length,
    data: { services },
  });
});

/**
 * GET /api/v1/services/:id
 * Public: Returns a single active service category by id or slug
 */
export const getServiceById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const service = await prisma.serviceCategory.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      isActive: true,
    },
  });

  if (!service) throw new AppError('Service category not found', 404);

  res.status(200).json({
    status: 'success',
    data: { service },
  });
});
