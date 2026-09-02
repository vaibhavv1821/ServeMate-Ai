import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { createBookingSchema } from '../../validators/phase2Validators.js';

/**
 * POST /api/v1/bookings
 * Customer: Create a booking.
 *
 * Double-booking prevention:
 * - Schema has @@unique([providerId, bookingDate, startTime, endTime])
 * - We use prisma.$transaction to check + create atomically
 * - PostgreSQL unique constraint catches any race conditions
 */
export const createBooking = catchAsync(async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

  const {
    providerId, serviceCategoryId, availabilityId,
    bookingDate, startTime, endTime,
    serviceAddress, city, latitude, longitude,
    estimatedPrice, notes,
  } = parsed.data;

  const bookingDateObj = new Date(bookingDate);


  // Run inside a transaction for atomicity
  // timeout: 30s to handle Neon pooler cold-start latency
  const booking = await prisma.$transaction(async (tx) => {

    // 1. Verify provider exists and is APPROVED
    const provider = await tx.provider.findFirst({
      where: { id: providerId, verificationStatus: 'APPROVED' },
    });
    if (!provider) throw new AppError('Provider not found or not approved', 404);

    // 2. Verify service category is valid
    const service = await tx.serviceCategory.findFirst({
      where: { id: serviceCategoryId, isActive: true },
    });
    if (!service) throw new AppError('Service category not found', 404);

    // 3. Verify availability slot if provided
    if (availabilityId) {
      const slot = await tx.availability.findUnique({ where: { id: availabilityId } });
      if (!slot) throw new AppError('Availability slot not found', 404);
      if (slot.providerId !== providerId) throw new AppError('Slot does not belong to this provider', 400);
      if (slot.isBooked) throw new AppError('This time slot is already booked', 409);
    }

    // 4. Check for conflicting booking on same provider/date/time
    const conflict = await tx.booking.findFirst({
      where: {
        providerId,
        bookingDate: bookingDateObj,
        startTime,
        endTime,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
    if (conflict) throw new AppError('This time slot is already booked for the selected provider', 409);

    // 5. Create booking
    const newBooking = await tx.booking.create({
      data: {
        customerId: req.user.id,
        providerId,
        serviceCategoryId,
        availabilityId: availabilityId || null,
        bookingDate: bookingDateObj,
        startTime,
        endTime,
        serviceAddress,
        city: city || null,
        latitude: latitude || null,
        longitude: longitude || null,
        estimatedPrice: estimatedPrice || null,
        notes: notes || null,
        status: 'PENDING',
      },
      include: {
        provider: { include: { user: { select: { name: true, phone: true } } } },
        serviceCategory: { select: { name: true } },
      },
    });

    // 6. Mark availability slot as booked if referenced
    if (availabilityId) {
      await tx.availability.update({ where: { id: availabilityId }, data: { isBooked: true } });
    }

    return newBooking;
  }, { timeout: 30000 });


  res.status(201).json({ status: 'success', message: 'Booking created. Waiting for provider confirmation.', data: { booking } });
});

/**
 * GET /api/v1/bookings/my
 * Customer: Get own bookings
 */
export const getMyBookings = catchAsync(async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { customerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      provider: { include: { user: { select: { name: true, profileImage: true } } } },
      serviceCategory: { select: { id: true, name: true } },
    },
  });

  res.status(200).json({ status: 'success', results: bookings.length, data: { bookings } });
});

/**
 * GET /api/v1/bookings/provider
 * Provider: Get bookings assigned to own profile
 */
export const getProviderBookings = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError('Provider profile not found', 404);

  const bookings = await prisma.booking.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, phone: true, profileImage: true } },
      serviceCategory: { select: { id: true, name: true } },
    },
  });

  res.status(200).json({ status: 'success', results: bookings.length, data: { bookings } });
});

/**
 * GET /api/v1/bookings/:id
 * Customer or Provider: Get single booking (authorized access only)
 */
export const getBookingById = catchAsync(async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      provider: { include: { user: { select: { name: true, phone: true } } } },
      serviceCategory: { select: { id: true, name: true } },
    },
  });

  if (!booking) throw new AppError('Booking not found', 404);

  // Authorization: only customer, provider owner, or admin can view
  const provider = req.user.role === 'PROVIDER'
    ? await prisma.provider.findUnique({ where: { userId: req.user.id } })
    : null;

  const isOwner =
    booking.customerId === req.user.id ||
    (provider && booking.providerId === provider.id) ||
    req.user.role === 'ADMIN';

  if (!isOwner) throw new AppError('You are not authorized to view this booking', 403);

  res.status(200).json({ status: 'success', data: { booking } });
});

/**
 * PATCH /api/v1/bookings/:id/accept
 * Provider: Accept a pending booking
 */
export const acceptBooking = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError('Provider profile not found', 404);

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.providerId !== provider.id) throw new AppError('This booking is not assigned to you', 403);
  if (booking.status !== 'PENDING') throw new AppError(`Cannot accept a booking with status: ${booking.status}`, 400);

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: 'CONFIRMED' },
  });

  res.status(200).json({ status: 'success', message: 'Booking confirmed', data: { booking: updated } });
});

/**
 * PATCH /api/v1/bookings/:id/reject
 * Provider: Reject a pending booking
 */
export const rejectBooking = catchAsync(async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError('Provider profile not found', 404);

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.providerId !== provider.id) throw new AppError('This booking is not assigned to you', 403);
  if (booking.status !== 'PENDING') throw new AppError(`Cannot reject a booking with status: ${booking.status}`, 400);

  const updated = await prisma.$transaction(async (tx) => {
    // Free up the availability slot if it was linked
    if (booking.availabilityId) {
      await tx.availability.update({ where: { id: booking.availabilityId }, data: { isBooked: false } });
    }
    return tx.booking.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
  }, { timeout: 30000 });

  res.status(200).json({ status: 'success', message: 'Booking rejected', data: { booking: updated } });
});

/**
 * PATCH /api/v1/bookings/:id/cancel
 * Customer: Cancel own booking
 */
export const cancelBooking = catchAsync(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customerId !== req.user.id) throw new AppError('You can only cancel your own bookings', 403);
  if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
    throw new AppError(`Cannot cancel a booking with status: ${booking.status}`, 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (booking.availabilityId) {
      await tx.availability.update({ where: { id: booking.availabilityId }, data: { isBooked: false } });
    }
    return tx.booking.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  }, { timeout: 30000 });

  res.status(200).json({ status: 'success', message: 'Booking cancelled', data: { booking: updated } });
});


/**
 * PATCH /api/v1/bookings/:id/complete
 * Provider or Admin: Mark a booking as completed
 */
export const completeBooking = catchAsync(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new AppError('Booking not found', 404);

  if (req.user.role === 'PROVIDER') {
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
    if (!provider || booking.providerId !== provider.id) {
      throw new AppError('This booking is not assigned to you', 403);
    }
  }

  if (!['CONFIRMED', 'SERVICE_STARTED'].includes(booking.status)) {
    throw new AppError('Only CONFIRMED or SERVICE_STARTED bookings can be marked complete', 400);
  }


  const updated = await prisma.$transaction(async (tx) => {
    // Increment provider completedJobs counter
    await tx.provider.update({
      where: { id: booking.providerId },
      data: { completedJobs: { increment: 1 } },
    });
    return tx.booking.update({ where: { id: req.params.id }, data: { status: 'COMPLETED' } });
  }, { timeout: 30000 });


  res.status(200).json({ status: 'success', message: 'Booking marked as completed', data: { booking: updated } });
});
