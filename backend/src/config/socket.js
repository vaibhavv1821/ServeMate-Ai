/**
 * Socket.io Server Factory (Phase 3)
 *
 * Attaches Socket.io to the HTTP server.
 * Authenticates all socket connections using JWT.
 * Provides room-based isolation per conversation.
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import prisma from './prisma.js';

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // ── JWT Authentication Middleware ────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required: no token provided'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Authentication failed: invalid or expired token'));
    }
  });

  // ── Connection Handler ───────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: userId=${socket.userId} role=${socket.userRole}`);

    // Join user to their personal room (for booking updates / direct notifications)
    socket.join(`user:${socket.userId}`);

    // ── Join Conversation Room ──────────────────────────────────────
    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) {
          socket.emit('error', { message: 'conversationId required' });
          return;
        }

        // Verify the user is a participant in this conversation
        const conv = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { customerId: socket.userId },
              { providerId: socket.userId },
            ],
          },
        });

        if (!conv) {
          socket.emit('error', { message: 'Unauthorized: you are not a participant in this conversation' });
          return;
        }

        socket.join(`conv:${conversationId}`);
        socket.emit('joined_conversation', { conversationId });
      } catch (err) {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // ── Send Message ────────────────────────────────────────────────
    socket.on('send_message', async ({ conversationId, content }) => {
      try {
        if (!conversationId || !content?.trim()) {
          socket.emit('error', { message: 'conversationId and content required' });
          return;
        }

        // Verify participant
        const conv = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { customerId: socket.userId },
              { providerId: socket.userId },
            ],
          },
        });

        if (!conv) {
          socket.emit('error', { message: 'Unauthorized conversation' });
          return;
        }

        // Persist to PostgreSQL
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: socket.userId,
            content: content.trim(),
          },
          include: {
            sender: { select: { id: true, name: true, profileImage: true } },
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Broadcast to room (including sender)
        io.to(`conv:${conversationId}`).emit('new_message', message);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Mark Messages as Read ───────────────────────────────────────
    socket.on('mark_read', async ({ conversationId }) => {
      try {
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: socket.userId },
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        io.to(`conv:${conversationId}`).emit('messages_read', {
          conversationId,
          readBy: socket.userId,
        });
      } catch {
        // Non-critical, ignore silently
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: userId=${socket.userId}`);
    });
  });

  return io;
};

/**
 * Emit a booking update to all relevant users.
 * Call this from booking controllers after DB update.
 */
export const emitBookingUpdate = (io, { customerId, providerId, booking }) => {
  const payload = {
    bookingId: booking.id,
    status: booking.status,
    updatedAt: booking.updatedAt,
  };
  io.to(`user:${customerId}`).emit('booking_update', payload);
  io.to(`user:${providerId}`).emit('booking_update', payload);
};
