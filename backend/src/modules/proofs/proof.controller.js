/**
 * Service Proof Controller (Phase 3)
 * Handles before/after service photo uploads via Cloudinary.
 *
 * Security:
 *   - Only booking participants (customer or provider) can upload
 *   - Before-service proof allowed on CONFIRMED or SERVICE_STARTED
 *   - After-service proof allowed on SERVICE_STARTED or COMPLETED
 *   - File validation handled by multer middleware (type + size)
 *   - Cloudinary public_id stored for potential future deletion
 */

import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';

// ── POST /api/v1/bookings/:id/proof ──────────────────────────────
export const uploadProof = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: bookingId } = req.params;
    const { type } = req.body; // BEFORE_SERVICE | AFTER_SERVICE

    if (!['BEFORE_SERVICE', 'AFTER_SERVICE'].includes(type)) {
      throw new AppError('type must be BEFORE_SERVICE or AFTER_SERVICE', 400);
    }

    if (!req.file) throw new AppError('No image file provided', 400);

    // Verify user is a participant in this booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { customerId: userId },
          { provider: { userId } },
        ],
      },
    });
    if (!booking) throw new AppError('Booking not found or unauthorized', 404);

    // Status gate
    const allowedForBefore = ['CONFIRMED', 'SERVICE_STARTED', 'COMPLETED'];
    const allowedForAfter  = ['SERVICE_STARTED', 'COMPLETED'];

    if (type === 'BEFORE_SERVICE' && !allowedForBefore.includes(booking.status)) {
      throw new AppError(`Cannot upload before-service proof for booking with status: ${booking.status}`, 400);
    }
    if (type === 'AFTER_SERVICE' && !allowedForAfter.includes(booking.status)) {
      throw new AppError(`Cannot upload after-service proof for booking with status: ${booking.status}`, 400);
    }

    // Save metadata to PostgreSQL
    const proof = await prisma.serviceProof.create({
      data: {
        bookingId,
        uploadedBy: userId,
        type,
        fileUrl: req.file.path,       // Cloudinary secure_url
        publicId: req.file.filename,  // Cloudinary public_id
      },
      include: {
        uploader: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json({
      status: 'success',
      message: `${type === 'BEFORE_SERVICE' ? 'Before' : 'After'}-service proof uploaded successfully.`,
      data: { proof },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/bookings/:id/proof ───────────────────────────────
export const getProofs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: bookingId } = req.params;

    // Verify participation
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { customerId: userId },
          { provider: { userId } },
        ],
      },
    });
    if (!booking) throw new AppError('Booking not found or unauthorized', 404);

    const proofs = await prisma.serviceProof.findMany({
      where: { bookingId },
      include: { uploader: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = {
      beforeService: proofs.filter((p) => p.type === 'BEFORE_SERVICE'),
      afterService:  proofs.filter((p) => p.type === 'AFTER_SERVICE'),
    };

    res.status(200).json({ status: 'success', data: { proofs: grouped } });
  } catch (err) {
    next(err);
  }
};
