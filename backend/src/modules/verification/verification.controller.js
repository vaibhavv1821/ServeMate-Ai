/**
 * OTP Verification Controller (Phase 3)
 *
 * Service-start OTP flow:
 *   1. Customer generates OTP → stored in Redis with 5-min TTL
 *   2. Customer shows OTP to provider
 *   3. Provider enters OTP → backend verifies → booking → SERVICE_STARTED
 *
 * Security:
 *   - 6-digit cryptographically random OTP (crypto.randomInt)
 *   - 5-minute expiry via Redis TTL
 *   - Max 5 verification attempts per OTP
 *   - Rate limit: max 3 OTP generations per user per minute
 *   - OTP deleted after successful verification (one-time use)
 *   - OTP is NEVER returned in the verify response
 */

import { randomInt } from 'crypto';
import { getRedis } from '../../config/redis.js';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { emitBookingUpdate } from '../../config/socket.js';

const OTP_TTL_SECONDS = 300;        // 5 minutes
const MAX_OTP_ATTEMPTS = 5;
const RATE_LIMIT_MAX = 3;           // max 3 generations per minute
const RATE_LIMIT_WINDOW_SECONDS = 60;

// ── POST /api/v1/bookings/:id/otp/generate ────────────────────────
// CUSTOMER only — must own the booking
export const generateOTP = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { id: bookingId } = req.params;
    const redis = getRedis();

    // Verify booking ownership and status
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, customerId },
    });
    if (!booking) throw new AppError('Booking not found or unauthorized', 404);
    if (booking.status !== 'CONFIRMED') {
      throw new AppError(
        `OTP can only be generated for CONFIRMED bookings. Current status: ${booking.status}`,
        400
      );
    }

    // Rate limit: max 3 OTP generations per minute per user
    const rateLimitKey = `otp_gen:${customerId}`;
    const genCount = await redis.incr(rateLimitKey);
    if (genCount === 1) await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
    if (genCount > RATE_LIMIT_MAX) {
      throw new AppError('Too many OTP requests. Please wait before generating a new OTP.', 429);
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = String(randomInt(100000, 999999));

    // Store in Redis with TTL
    const otpKey = `otp:${bookingId}`;
    await redis.set(otpKey, JSON.stringify({ otp, attempts: 0 }), { ex: OTP_TTL_SECONDS });

    // Return OTP to customer (demo/dev display)
    res.status(200).json({
      status: 'success',
      message: 'OTP generated successfully. Share this OTP with your service provider.',
      data: {
        otp, // Customer sees this; they share it verbally with the provider
        expiresInSeconds: OTP_TTL_SECONDS,
        bookingId,
        note: '⚠️  This OTP is for development/demo. In production, display only on customer device.',
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/bookings/:id/otp/verify ─────────────────────────
// PROVIDER only — verifies OTP and starts service
export const verifyOTP = async (req, res, next) => {
  try {
    const providerUserId = req.user.id;
    const { id: bookingId } = req.params;
    const { otp } = req.body;
    const redis = getRedis();

    if (!otp) throw new AppError('OTP is required', 400);

    // Verify provider owns this booking
    const providerProfile = await prisma.provider.findFirst({
      where: { userId: providerUserId },
    });
    if (!providerProfile) throw new AppError('Provider profile not found', 404);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, providerId: providerProfile.id },
      include: { customer: { select: { id: true } } },
    });
    if (!booking) throw new AppError('Booking not found or unauthorized', 404);
    if (booking.status !== 'CONFIRMED') {
      throw new AppError(
        `OTP verification only valid for CONFIRMED bookings. Current status: ${booking.status}`,
        400
      );
    }

    // Retrieve OTP from Redis
    const otpKey = `otp:${bookingId}`;
    const stored = await redis.get(otpKey);
    if (!stored) {
      throw new AppError('OTP has expired or does not exist. Ask the customer to generate a new OTP.', 410);
    }

    const otpData = typeof stored === 'string' ? JSON.parse(stored) : stored;

    // Check attempt limit
    if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
      await redis.del(otpKey); // Delete exhausted OTP
      throw new AppError('Too many failed OTP attempts. Ask the customer to generate a new OTP.', 429);
    }

    // Verify OTP (constant-time string comparison via === is fine for numeric OTPs)
    if (String(otp).trim() !== otpData.otp) {
      // Increment attempts
      otpData.attempts += 1;
      const ttl = await redis.ttl(otpKey);
      await redis.set(otpKey, JSON.stringify(otpData), { ex: ttl > 0 ? ttl : OTP_TTL_SECONDS });

      const attemptsLeft = MAX_OTP_ATTEMPTS - otpData.attempts;
      throw new AppError(
        `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
        400
      );
    }

    // OTP is correct — delete it (one-time use)
    await redis.del(otpKey);

    // Update booking status to SERVICE_STARTED
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'SERVICE_STARTED' },
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      emitBookingUpdate(io, {
        customerId: booking.customer.id,
        providerId: providerUserId,
        booking: updatedBooking,
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully. Service has been started.',
      data: { booking: { id: updatedBooking.id, status: updatedBooking.status } },
    });
  } catch (err) {
    next(err);
  }
};
