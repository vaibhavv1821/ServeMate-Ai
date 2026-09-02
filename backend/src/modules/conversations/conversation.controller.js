/**
 * Conversation Controller (Phase 3)
 * Handles REST endpoints for conversations and messages.
 * Real-time delivery is handled separately via Socket.io.
 */

import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';

// ── GET /api/v1/conversations ─────────────────────────────────────
export const getMyConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const where =
      role === 'CUSTOMER'
        ? { customerId: userId }
        : role === 'PROVIDER'
        ? { providerId: userId }
        : { OR: [{ customerId: userId }, { providerId: userId }] };

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, profileImage: true } },
        provider: { select: { id: true, name: true, profileImage: true } },
        booking: { select: { id: true, status: true, serviceCategory: { select: { name: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderId: true, readAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Add unread count per conversation
    const convWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        });
        return { ...conv, unreadCount };
      })
    );

    res.status(200).json({ status: 'success', data: { conversations: convWithUnread } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/conversations ────────────────────────────────────
// Customer creates a conversation linked to a booking
export const createConversation = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { bookingId } = req.body;

    if (!bookingId) throw new AppError('bookingId is required', 400);

    // Verify booking belongs to this customer
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, customerId },
      include: { provider: { select: { userId: true } } },
    });
    if (!booking) throw new AppError('Booking not found or unauthorized', 404);

    const providerId = booking.provider.userId;

    // Upsert conversation (idempotent)
    const conversation = await prisma.conversation.upsert({
      where: { customerId_providerId: { customerId, providerId } },
      create: { customerId, providerId, bookingId },
      update: { bookingId },
      include: {
        customer: { select: { id: true, name: true, profileImage: true } },
        provider: { select: { id: true, name: true, profileImage: true } },
        booking: { select: { id: true, status: true } },
      },
    });

    res.status(201).json({ status: 'success', data: { conversation } });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/conversations/:id/messages ────────────────────────
export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { cursor, limit = 50 } = req.query;

    // Verify participation
    const conv = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ customerId: userId }, { providerId: userId }],
      },
    });
    if (!conv) throw new AppError('Conversation not found or unauthorized', 404);

    const messages = await prisma.message.findMany({
      where: { conversationId, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
      include: { sender: { select: { id: true, name: true, profileImage: true } } },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });

    res.status(200).json({
      status: 'success',
      data: { messages: messages.reverse(), nextCursor: messages.length === Number(limit) ? messages[0]?.createdAt : null },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/conversations/:id/messages ───────────────────────
// REST fallback — real-time delivery via Socket.io is preferred
export const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) throw new AppError('Message content is required', 400);

    const conv = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ customerId: userId }, { providerId: userId }],
      },
    });
    if (!conv) throw new AppError('Conversation not found or unauthorized', 404);

    const message = await prisma.message.create({
      data: { conversationId, senderId: userId, content: content.trim() },
      include: { sender: { select: { id: true, name: true, profileImage: true } } },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    // Emit via Socket.io if available
    const io = req.app.get('io');
    if (io) io.to(`conv:${conversationId}`).emit('new_message', message);

    res.status(201).json({ status: 'success', data: { message } });
  } catch (err) {
    next(err);
  }
};
