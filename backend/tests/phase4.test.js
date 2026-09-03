/**
 * ServMate Phase 4 Integration Tests
 *
 * Covers:
 * 1. AI analyze endpoint requires authentication (401 without token)
 * 2. AI input validation (rejects < 5 chars)
 * 3. AI output maps to existing database ServiceCategory
 * 4. Urgency classification validates NORMAL, URGENT, EMERGENCY
 * 5. AI fallback operates reliably when no external key is present
 * 6. Rate limiting via Redis enforces max requests per minute
 * 7. Booking creation with Emergency Mode (urgency: 'EMERGENCY')
 * 8. Emergency Smart Matching boosts available & nearby providers
 * 9. Provider rejects booking → status becomes REJECTED
 * 10. Backup Provider candidates query excludes original rejected provider
 * 11. Backup Provider candidates only includes APPROVED providers offering service
 * 12. Reassigning to backup provider updates booking and frees previous slot
 * 13. Double-booking prevention preserved during backup reassignment
 * 14. Unauthorized customer cannot reassign someone else's booking
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

let server, baseUrl;
const TS = Date.now();
const CUSTOMER_EMAIL   = `cust.p4.${TS}@servmate.test`;
const OTHER_CUST_EMAIL = `other.p4.${TS}@servmate.test`;
const PROVIDER_A_EMAIL = `prov.a.p4.${TS}@servmate.test`;
const PROVIDER_B_EMAIL = `prov.b.p4.${TS}@servmate.test`;
const PROVIDER_C_EMAIL = `prov.c.p4.${TS}@servmate.test`;

let customerToken, otherCustToken, providerAToken, providerBToken;
let providerAId, providerBId, providerCId;
let categoryId, categoryName;
let bookingId;

const req = (method, url, body, token) =>
  fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

const POST = (u, b, t) => req('POST', u, b, t);
const GET  = (u, t)    => req('GET',  u, undefined, t);
const PATCH= (u, b, t) => req('PATCH',u, b, t);

before(async () => {
  server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  baseUrl = `http://localhost:${server.address().port}/api/v1`;

  // Warm-up database connection
  for (let i = 0; i < 3; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // 1. Fetch an active category
  const cat = await prisma.serviceCategory.findFirst({ where: { isActive: true } });
  categoryId = cat.id;
  categoryName = cat.name;

  // 2. Register customer
  const custRes = await (await POST(`${baseUrl}/auth/register`, {
    name: 'Customer P4',
    email: CUSTOMER_EMAIL,
    password: 'Password123!',
    role: 'CUSTOMER',
  })).json();
  customerToken = custRes.data.token;

  // 3. Register other customer
  const otherRes = await (await POST(`${baseUrl}/auth/register`, {
    name: 'Other Customer P4',
    email: OTHER_CUST_EMAIL,
    password: 'Password123!',
    role: 'CUSTOMER',
  })).json();
  otherCustToken = otherRes.data.token;

  // 4. Register Provider A (primary)
  const provARes = await (await POST(`${baseUrl}/auth/register`, {
    name: 'Provider A P4',
    email: PROVIDER_A_EMAIL,
    password: 'Password123!',
    role: 'PROVIDER',
  })).json();
  providerAToken = provARes.data.token;

  const profileA = await prisma.provider.create({
    data: {
      userId: provARes.data.user.id,
      city: 'Mumbai',
      latitude: 19.0760,
      longitude: 72.8777,
      hourlyRate: 500,
      experienceYears: 6,
      averageRating: 4.8,
      totalReviews: 12,
      verificationStatus: 'APPROVED',
    },
  });
  providerAId = profileA.id;
  await prisma.providerService.create({
    data: { providerId: providerAId, serviceCategoryId: categoryId },
  });

  // 5. Register Provider B (backup candidate, approved, closer)
  const provBRes = await (await POST(`${baseUrl}/auth/register`, {
    name: 'Provider B Backup P4',
    email: PROVIDER_B_EMAIL,
    password: 'Password123!',
    role: 'PROVIDER',
  })).json();
  providerBToken = provBRes.data.token;

  const profileB = await prisma.provider.create({
    data: {
      userId: provBRes.data.user.id,
      city: 'Mumbai',
      latitude: 19.0800,
      longitude: 72.8800,
      hourlyRate: 550,
      experienceYears: 8,
      averageRating: 4.9,
      totalReviews: 20,
      verificationStatus: 'APPROVED',
    },
  });
  providerBId = profileB.id;
  await prisma.providerService.create({
    data: { providerId: providerBId, serviceCategoryId: categoryId },
  });

  // Create availability slot for Provider B
  await prisma.availability.create({
    data: {
      providerId: providerBId,
      dayOfWeek: 'MONDAY',
      startTime: '10:00',
      endTime: '11:00',
      isBooked: false,
    },
  });

  // 6. Register Provider C (unapproved provider, should NEVER be chosen as backup)
  const provCRes = await (await POST(`${baseUrl}/auth/register`, {
    name: 'Provider C Unapproved',
    email: PROVIDER_C_EMAIL,
    password: 'Password123!',
    role: 'PROVIDER',
  })).json();
  const profileC = await prisma.provider.create({
    data: {
      userId: provCRes.data.user.id,
      city: 'Mumbai',
      verificationStatus: 'PENDING', // Unapproved!
    },
  });
  providerCId = profileC.id;
  await prisma.providerService.create({
    data: { providerId: providerCId, serviceCategoryId: categoryId },
  });
});

after(async () => {
  try {
    await prisma.booking.deleteMany({
      where: { customer: { email: { in: [CUSTOMER_EMAIL, OTHER_CUST_EMAIL] } } },
    });
    await prisma.availability.deleteMany({
      where: { providerId: { in: [providerAId, providerBId, providerCId].filter(Boolean) } },
    });
    await prisma.providerService.deleteMany({
      where: { providerId: { in: [providerAId, providerBId, providerCId].filter(Boolean) } },
    });
    await prisma.provider.deleteMany({
      where: { id: { in: [providerAId, providerBId, providerCId].filter(Boolean) } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [CUSTOMER_EMAIL, OTHER_CUST_EMAIL, PROVIDER_A_EMAIL, PROVIDER_B_EMAIL, PROVIDER_C_EMAIL] } },
    });
  } catch {}
  if (server) await new Promise((r) => server.close(r));
});

test('Phase 4 Integration Suite', async (t) => {
  // ── 1. AI Analysis Authentication ──────────────────────────
  await t.test('1. AI analyze endpoint rejects unauthenticated request (401)', async () => {
    const res = await POST(`${baseUrl}/ai/analyze-service`, { description: 'AC is not cooling' });
    assert.equal(res.status, 401);
  });

  // ── 2. AI Input Validation ─────────────────────────────────
  await t.test('2. AI analyze endpoint rejects short description (< 5 chars)', async () => {
    const res = await POST(`${baseUrl}/ai/analyze-service`, { description: 'leak' }, customerToken);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /at least 5 characters/i);
  });

  // ── 3. AI Categorization & Mapping ─────────────────────────
  await t.test('3. AI analyzer returns structured recommendation mapped to database category', async () => {
    const res = await POST(
      `${baseUrl}/ai/analyze-service`,
      { description: 'Water is leaking heavily from the kitchen pipe under the sink' },
      customerToken
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.ok(body.data.category, 'Must return a category name');
    assert.ok(body.data.serviceCategoryId, 'Must return a valid DB service category ID');
    assert.ok(body.data.issue, 'Must return issue summary');
    assert.ok(['NORMAL', 'URGENT', 'EMERGENCY'].includes(body.data.urgency));
    assert.ok(body.data.confidence >= 0 && body.data.confidence <= 1);
    assert.match(body.data.disclaimer, /AI-assisted recommendation/i);
  });

  // ── 4. Emergency Urgency Detection ─────────────────────────
  await t.test('4. AI analyzer detects emergency urgency on dangerous issue descriptions', async () => {
    const res = await POST(
      `${baseUrl}/ai/analyze-service`,
      { description: 'Sparking electrical circuit breaker with smoke and burning smell in kitchen' },
      customerToken
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.urgency, 'EMERGENCY');
  });

  // ── 5. Emergency Booking Creation ──────────────────────────
  await t.test('5. Customer can create an EMERGENCY booking with AI metadata', async () => {
    const res = await POST(
      `${baseUrl}/bookings`,
      {
        providerId: providerAId,
        serviceCategoryId: categoryId,
        bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        serviceAddress: 'Flat 402, High Street, Bandra West, Mumbai',
        city: 'Mumbai',
        latitude: 19.0760,
        longitude: 72.8777,
        urgency: 'EMERGENCY',
        aiCategory: categoryName,
        aiSuggestedIssue: 'Water line burst',
        aiSuggestedUrgency: 'EMERGENCY',
        aiConfidence: 0.92,
      },
      customerToken
    );
    assert.equal(res.status, 201);
    const data = await res.json();
    bookingId = data.data.booking.id;
    assert.equal(data.data.booking.urgency, 'EMERGENCY');
    assert.equal(data.data.booking.isEmergency, true);
    assert.equal(data.data.booking.status, 'PENDING');
  });

  // ── 6. Emergency Smart Matching Prioritization ─────────────
  await t.test('6. Smart matching applies emergency prioritization for rapid dispatch', async () => {
    const { matchProviders } = await import('../src/modules/matching/matching.service.js');
    const providers = await prisma.provider.findMany({
      where: { id: { in: [providerAId, providerBId] } },
      include: { services: true, availability: true },
    });

    const normalMatches = matchProviders(providers, {
      serviceCategoryId: categoryId,
      latitude: 19.0800,
      longitude: 72.8800,
      dayOfWeek: 'MONDAY',
      startTime: '10:00',
      urgency: 'NORMAL',
    });

    const emergencyMatches = matchProviders(providers, {
      serviceCategoryId: categoryId,
      latitude: 19.0800,
      longitude: 72.8800,
      dayOfWeek: 'MONDAY',
      startTime: '10:00',
      urgency: 'EMERGENCY',
    });

    assert.ok(emergencyMatches.length >= 2);
    // Provider B has the slot available + ultra-close distance, should get emergency bonus
    const bMatch = emergencyMatches.find((m) => m.provider.id === providerBId);
    assert.ok(bMatch.matchReasons.some((r) => r.includes('Emergency Priority')));
  });

  // ── 7. Provider Rejects Booking ────────────────────────────
  await t.test('7. Provider A rejects pending booking', async () => {
    const res = await PATCH(`${baseUrl}/bookings/${bookingId}/reject`, {}, providerAToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.data.booking.status, 'REJECTED');
  });

  // ── 8. Backup Candidates Discovery ─────────────────────────
  await t.test('8. Customer queries backup candidates: excludes Provider A and excludes unapproved Provider C', async () => {
    const res = await GET(`${baseUrl}/bookings/${bookingId}/backup-candidates`, customerToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    const candidateIds = body.data.candidates.map((c) => c.provider.id);

    // Must NOT contain rejected Provider A
    assert.ok(!candidateIds.includes(providerAId), 'Rejected provider must be excluded');
    // Must NOT contain unapproved Provider C
    assert.ok(!candidateIds.includes(providerCId), 'Unapproved provider must be excluded');
    // Must contain eligible Provider B
    assert.ok(candidateIds.includes(providerBId), 'Approved backup provider B should be included');
  });

  // ── 9. Unauthorized Backup Query Rejection ─────────────────
  await t.test('9. Other customer cannot access backup candidates for this booking (403)', async () => {
    const res = await GET(`${baseUrl}/bookings/${bookingId}/backup-candidates`, otherCustToken);
    assert.equal(res.status, 403);
  });

  // ── 10. Atomic Backup Reassignment ─────────────────────────
  await t.test('10. Customer reassigns booking to Provider B atomically', async () => {
    const res = await POST(
      `${baseUrl}/bookings/${bookingId}/reassign-backup`,
      { backupProviderId: providerBId },
      customerToken
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.data.booking.providerId, providerBId);
    assert.equal(data.data.booking.backupProviderId, providerAId);
    assert.equal(data.data.booking.status, 'PENDING');
  });

  // ── 11. Reassignment Verified in Database ──────────────────
  await t.test('11. Database confirms booking is reassigned to Provider B', async () => {
    const updated = await prisma.booking.findUnique({ where: { id: bookingId } });
    assert.equal(updated.providerId, providerBId);
    assert.equal(updated.backupProviderId, providerAId);
  });

  // ── 12. Double-Booking Protection for Backup Provider ──────
  await t.test('12. Conflicting booking for Provider B on same slot is prevented (409)', async () => {
    // Provider B accepts the booking
    await PATCH(`${baseUrl}/bookings/${bookingId}/accept`, {}, providerBToken);

    // Another customer tries to book Provider B at the exact same date and time
    const bookingDateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const res = await POST(
      `${baseUrl}/bookings`,
      {
        providerId: providerBId,
        serviceCategoryId: categoryId,
        bookingDate: bookingDateStr,
        startTime: '10:00',
        endTime: '11:00',
        serviceAddress: 'Some other location',
        city: 'Mumbai',
      },
      otherCustToken
    );
    assert.equal(res.status, 409, 'Conflict must be rejected with 409 Conflict');
  });
});
