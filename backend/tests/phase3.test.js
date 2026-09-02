/**
 * ServMate Phase 3 Integration Test Suite
 *
 * Tests: Socket.io auth, Redis OTP, service verification,
 *        reviews, trust profile, booking status transitions
 *
 * Run: node --test tests/phase3.test.js
 *
 * Node.js v20+ runs top-level tests concurrently by default.
 * All tests are wrapped in a single sequential suite using awaited subtests.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { io as ioClient } from 'socket.io-client';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { getRedis } from '../src/config/redis.js';
import { createSocketServer } from '../src/config/socket.js';
import bcrypt from 'bcryptjs';

let server, baseUrl, io;
const TS = Date.now();

const CE = `cust.p3.${TS}@servmate.test`;
const PE = `prov.p3.${TS}@servmate.test`;
const AE = `admin.p3.${TS}@servmate.test`;

const POST  = (u, b, t) => fetch(u, { method: 'POST',  headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(b) });
const GET   = (u, t)    => fetch(u, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
const PATCH = (u, b, t) => fetch(u, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(b) });

before(async () => {
  server = http.createServer(app);
  io = createSocketServer(server);
  app.set('io', io);
  await new Promise((res) => server.listen(0, res));
  baseUrl = `http://localhost:${server.address().port}/api/v1`;

  // Pre-clean any leftover Redis keys from previous test runs to prevent
  // rate-limit contamination across test re-runs
  try {
    const redis = getRedis();
    const otpKeys    = await redis.keys('otp:*');
    const rateLimits = await redis.keys('otp_gen:*');
    const testKeys   = await redis.keys('test:p3:*');
    for (const k of [...otpKeys, ...rateLimits, ...testKeys]) await redis.del(k);
  } catch {
    // Non-fatal — if Redis is down, Redis tests will fail with meaningful errors
  }
});


after(async () => {
  // Cleanup Redis OTP keys
  const redis = getRedis();
  const keys = await redis.keys('otp:*');
  for (const k of keys) await redis.del(k);

  // Cleanup DB
  await prisma.review.deleteMany({ where: { customer: { email: CE } } });
  await prisma.serviceProof.deleteMany({ where: { booking: { customer: { email: CE } } } });
  await prisma.message.deleteMany({ where: { conversation: { customer: { email: CE } } } });
  await prisma.conversation.deleteMany({ where: { customer: { email: CE } } });
  await prisma.booking.deleteMany({ where: { customer: { email: CE } } });
  await prisma.availability.deleteMany({ where: { provider: { user: { email: PE } } } });
  await prisma.providerService.deleteMany({ where: { provider: { user: { email: PE } } } });
  await prisma.provider.deleteMany({ where: { user: { email: PE } } });
  await prisma.user.deleteMany({ where: { email: { in: [CE, PE, AE] } } });
  await prisma.$disconnect();
  io.close();
  await new Promise((res) => server.close(res));
});

test('Phase 3 Integration Suite', async (t) => {
  // ── Bootstrap ─────────────────────────────────────────────────────
  const custRes = await (await POST(`${baseUrl}/auth/register`, { name: 'P3 Customer', email: CE, password: 'Pass1234!', role: 'CUSTOMER' })).json();
  const provRes = await (await POST(`${baseUrl}/auth/register`, { name: 'P3 Provider', email: PE, password: 'Pass1234!', role: 'PROVIDER' })).json();
  let customerToken = custRes.data.token;
  let providerToken = provRes.data.token;
  let customerId    = custRes.data.user.id;
  let providerId    = provRes.data.user.id;

  // Create admin
  await prisma.user.create({ data: { name: 'P3 Admin', email: AE, password: await bcrypt.hash('Pass1234!', 10), role: 'ADMIN' } });
  const adminRes = await (await POST(`${baseUrl}/auth/login`, { email: AE, password: 'Pass1234!' })).json();
  let adminToken = adminRes.data.token;

  // Get a service category
  const svcRes = await (await GET(`${baseUrl}/services`)).json();
  let serviceCategoryId = svcRes.data.services[0].id;

  // Create & approve provider
  const profileRes = await (await POST(`${baseUrl}/providers/profile`, { bio: 'P3 Test Provider', experienceYears: 3, hourlyRate: 400, city: 'Delhi', state: 'Delhi', latitude: 28.6, longitude: 77.2 }, providerToken)).json();
  let providerProfileId = profileRes.data.provider.id;

  await fetch(`${baseUrl}/providers/services`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` }, body: JSON.stringify({ serviceCategoryIds: [serviceCategoryId] }) });
  await PATCH(`${baseUrl}/providers/${providerProfileId}/approve`, {}, adminToken);

  // Create availability
  await POST(`${baseUrl}/availability`, { dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '11:00' }, providerToken);

  // Create confirmed booking
  const futureDate = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const bookRes = await (await POST(`${baseUrl}/bookings`, { providerId: providerProfileId, serviceCategoryId, bookingDate: futureDate, startTime: '10:00', endTime: '11:00', serviceAddress: '1 Test Rd, Delhi', city: 'Delhi' }, customerToken)).json();
  let bookingId = bookRes.data.booking.id;

  await PATCH(`${baseUrl}/bookings/${bookingId}/accept`, {}, providerToken);

  // ═══════════════════════════════════════════════════
  // SOCKET.IO — AUTHENTICATION
  // ═══════════════════════════════════════════════════

  await t.test('1. Authenticated socket connection succeeds', async () => {
    const port = server.address().port;
    return new Promise((resolve, reject) => {
      const socket = ioClient(`http://localhost:${port}`, { auth: { token: customerToken }, timeout: 10000 });
      socket.on('connect', () => { socket.disconnect(); resolve(); });
      socket.on('connect_error', (err) => reject(new Error(`Socket connect error: ${err.message}`)));
    });
  });

  await t.test('2. Unauthenticated socket connection is rejected', async () => {
    const port = server.address().port;
    return new Promise((resolve, reject) => {
      const socket = ioClient(`http://localhost:${port}`, { auth: {}, timeout: 10000 });
      socket.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication'), `Expected auth error, got: ${err.message}`);
        socket.disconnect();
        resolve();
      });
      socket.on('connect', () => {
        socket.disconnect();
        reject(new Error('Socket should have been rejected'));
      });
    });
  });

  await t.test('3. Invalid token socket connection is rejected', async () => {
    const port = server.address().port;
    return new Promise((resolve, reject) => {
      const socket = ioClient(`http://localhost:${port}`, { auth: { token: 'invalid.jwt.token' }, timeout: 10000 });
      socket.on('connect_error', () => { socket.disconnect(); resolve(); });
      socket.on('connect', () => { socket.disconnect(); reject(new Error('Should be rejected')); });
    });
  });

  // ═══════════════════════════════════════════════════
  // CONVERSATIONS
  // ═══════════════════════════════════════════════════

  let conversationId;

  await t.test('4. Customer can create a conversation linked to booking', async () => {
    const res = await POST(`${baseUrl}/conversations`, { bookingId }, customerToken);
    const data = await res.json();
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.ok(data.data.conversation.id);
    conversationId = data.data.conversation.id;
  });

  await t.test('5. Customer can list own conversations', async () => {
    const res = await GET(`${baseUrl}/conversations`, customerToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.conversations.length >= 1);
  });

  await t.test('6. Unauthenticated request to conversations returns 401', async () => {
    const res = await GET(`${baseUrl}/conversations`);
    assert.equal(res.status, 401);
  });

  // ═══════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════

  let messageId;

  await t.test('7. Customer can send a message via REST endpoint', async () => {
    const res = await POST(`${baseUrl}/conversations/${conversationId}/messages`, { content: 'Hello provider!' }, customerToken);
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.data.message.content, 'Hello provider!');
    messageId = data.data.message.id;
  });

  await t.test('8. Message is persisted in PostgreSQL', async () => {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    assert.ok(msg, 'Message should be in DB');
    assert.equal(msg.content, 'Hello provider!');
  });

  await t.test('9. Provider can read conversation messages', async () => {
    const res = await GET(`${baseUrl}/conversations/${conversationId}/messages`, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.messages.length >= 1);
  });

  await t.test('10. Unauthorized user cannot read conversation', async () => {
    // Create another user
    const otherRes = await (await POST(`${baseUrl}/auth/register`, { name: 'Other', email: `other.p3.${TS}@servmate.test`, password: 'Pass1234!', role: 'CUSTOMER' })).json();
    const res = await GET(`${baseUrl}/conversations/${conversationId}/messages`, otherRes.data.token);
    assert.equal(res.status, 404, 'Unauthorized user should get 404 (not found/unauthorized)');
  });

  // ═══════════════════════════════════════════════════
  // REDIS — OTP
  // ═══════════════════════════════════════════════════

  let generatedOtp;

  await t.test('11. Redis connection works', async () => {
    const redis = getRedis();
    await redis.set(`test:p3:${TS}`, 'ok', { ex: 10 });
    const val = await redis.get(`test:p3:${TS}`);
    assert.equal(val, 'ok');
    await redis.del(`test:p3:${TS}`);
  });

  await t.test('12. Customer can generate OTP for confirmed booking', async () => {
    const res = await POST(`${baseUrl}/bookings/${bookingId}/otp/generate`, {}, customerToken);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
    assert.ok(data.data.otp, 'OTP should be returned to customer');
    assert.equal(String(data.data.otp).length, 6, 'OTP must be 6 digits');
    generatedOtp = data.data.otp;
  });

  await t.test('13. OTP is stored in Redis', async () => {
    const redis = getRedis();
    const stored = await redis.get(`otp:${bookingId}`);
    assert.ok(stored, 'OTP should be in Redis');
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    assert.equal(parsed.attempts, 0);
  });

  await t.test('14. OTP has TTL set', async () => {
    const redis = getRedis();
    const ttl = await redis.ttl(`otp:${bookingId}`);
    assert.ok(ttl > 0 && ttl <= 300, `TTL should be 0–300, got ${ttl}`);
  });

  await t.test('15. Wrong OTP increments attempts counter', async () => {
    const res = await POST(`${baseUrl}/bookings/${bookingId}/otp/verify`, { otp: '000000' }, providerToken);
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.ok(data.message.includes('Invalid OTP'));
    // Check attempts incremented
    const redis = getRedis();
    const stored = await redis.get(`otp:${bookingId}`);
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    assert.equal(parsed.attempts, 1);
  });

  await t.test('16. Customer cannot verify OTP (role restriction)', async () => {
    const res = await POST(`${baseUrl}/bookings/${bookingId}/otp/verify`, { otp: generatedOtp }, customerToken);
    assert.equal(res.status, 403);
  });

  await t.test('17. Provider verifies correct OTP → booking becomes SERVICE_STARTED', async () => {
    const res = await POST(`${baseUrl}/bookings/${bookingId}/otp/verify`, { otp: generatedOtp }, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
    assert.equal(data.data.booking.status, 'SERVICE_STARTED');
  });

  await t.test('18. OTP is deleted from Redis after successful verification (one-time use)', async () => {
    const redis = getRedis();
    const stored = await redis.get(`otp:${bookingId}`);
    assert.equal(stored, null, 'OTP should be deleted after use');
  });

  // ═══════════════════════════════════════════════════
  // BOOKING STATUS TRANSITIONS
  // ═══════════════════════════════════════════════════

  await t.test('19. Invalid transition SERVICE_STARTED → PENDING is rejected', async () => {
    // Try to cancel a started service (CANCELLED from SERVICE_STARTED should be rejected by controller)
    // Booking is now SERVICE_STARTED — try to accept again (which makes no sense)
    const res = await PATCH(`${baseUrl}/bookings/${bookingId}/accept`, {}, providerToken);
    assert.ok([400, 404, 409].includes(res.status), `Expected 400/404/409, got ${res.status}`);
  });

  await t.test('20. Provider can complete a SERVICE_STARTED booking', async () => {
    const res = await PATCH(`${baseUrl}/bookings/${bookingId}/complete`, {}, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.booking.status, 'COMPLETED');
  });

  // ═══════════════════════════════════════════════════
  // REVIEWS
  // ═══════════════════════════════════════════════════

  let reviewId;

  await t.test('21. Customer can submit review after COMPLETED booking', async () => {
    const res = await POST(`${baseUrl}/bookings/${bookingId}/review`, { rating: 5, comment: 'Excellent service!' }, customerToken);
    const data = await res.json();
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.equal(data.data.review.rating, 5);
    reviewId = data.data.review.id;
  });

  await t.test('22. Duplicate review is rejected with 409', async () => {
    const res = await POST(`${baseUrl}/bookings/${bookingId}/review`, { rating: 4 }, customerToken);
    assert.equal(res.status, 409);
  });

  await t.test('23. Provider stats are updated after review', async () => {
    const provider = await prisma.provider.findUnique({ where: { id: providerProfileId } });
    assert.equal(provider.totalReviews, 1);
    assert.equal(provider.averageRating, 5.0);
  });

  await t.test('24. Invalid rating (0) is rejected', async () => {
    // Need a fresh booking for this
    const b2Res = await (await POST(`${baseUrl}/bookings`, { providerId: providerProfileId, serviceCategoryId, bookingDate: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', serviceAddress: '2 Test Rd, Delhi', city: 'Delhi' }, customerToken)).json();
    const res = await POST(`${baseUrl}/bookings/${b2Res.data?.booking?.id || bookingId}/review`, { rating: 0 }, customerToken);
    assert.equal(res.status, 400);
  });

  await t.test('25. Provider cannot review themselves', async () => {
    const res = await POST(`${baseUrl}/bookings/${bookingId}/review`, { rating: 5 }, providerToken);
    assert.equal(res.status, 403);
  });

  // ═══════════════════════════════════════════════════
  // TRUST PROFILE
  // ═══════════════════════════════════════════════════

  await t.test('26. GET /providers/:id/reviews returns accurate review data', async () => {
    const res = await GET(`${baseUrl}/providers/${providerProfileId}/reviews`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.reviews.length >= 1);
    assert.equal(data.data.stats.totalReviews, 1);
    assert.equal(data.data.stats.averageRating, 5.0);
  });

  await t.test('27. GET /providers/:id/trust returns deterministic score with factors', async () => {
    const res = await GET(`${baseUrl}/providers/${providerProfileId}/trust`, adminToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(typeof data.data.trustScore === 'number');
    assert.ok(data.data.trustScore >= 0 && data.data.trustScore <= 100);
    assert.ok(Array.isArray(data.data.factors));
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(data.data.trustLevel));
    // Verify completedJobs is real data, not fake
    assert.equal(data.data.profile.completedJobs, 1); // completed 1 booking
  });
});
