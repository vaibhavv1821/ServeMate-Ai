import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { createAvailabilitySchema } from '../../validators/phase2Validators.js';

/**
 * POST /api/v1/availability
 * Provider: Create a time slot
 */
export const createAvailability = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError('Create your provider profile first', 404);

  const parsed = createAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

  const slot = await prisma.availability.create({
    data: { providerId: provider.id, ...parsed.data },
  });

  res.status(201).json({ status: 'success', data: { slot } });
});

/**
 * GET /api/v1/availability/my
 * Provider: Get own availability slots
 */
export const getMyAvailability = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError('Provider profile not found', 404);

  const slots = await prisma.availability.findMany({
    where: { providerId: provider.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  res.status(200).json({ status: 'success', results: slots.length, data: { slots } });
});

/**
 * DELETE /api/v1/availability/:id
 * Provider: Delete own availability slot
 */
export const deleteAvailability = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError('Provider profile not found', 404);

  const slot = await prisma.availability.findUnique({ where: { id: req.params.id } });
  if (!slot) throw new AppError('Availability slot not found', 404);
  if (slot.providerId !== provider.id) throw new AppError('You can only delete your own availability slots', 403);
  if (slot.isBooked) throw new AppError('Cannot delete a booked slot', 400);

  await prisma.availability.delete({ where: { id: req.params.id } });

  res.status(200).json({ status: 'success', message: 'Availability slot deleted' });
});

/**
 * GET /api/v1/availability/provider/:providerId
 * Public: Get a provider's available (non-booked) slots
 */
export const getProviderAvailability = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findFirst({
    where: { id: req.params.providerId, verificationStatus: 'APPROVED' },
  });
  if (!provider) throw new AppError('Provider not found', 404);

  const slots = await prisma.availability.findMany({
    where: { providerId: req.params.providerId, isBooked: false },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  res.status(200).json({ status: 'success', results: slots.length, data: { slots } });
});
