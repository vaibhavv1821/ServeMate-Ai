/**
 * ServMate Phase 2 Integration Test Suite
 *
 * Node.js v20+ test runner runs top-level test() calls concurrently by default.
 * To ensure sequential execution (required because tests share state like
 * providerProfileId and bookingId), ALL tests are wrapped in a single top-level
 * test and run as sequential awaited subtests via t.test().
 *
 * Run: node --test tests/phase2.test.js
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

let server, baseUrl;
const TS = Date.now();
const CUSTOMER_EMAIL = `cust.p2.${TS}@servmate.test`;
const PROVIDER_EMAIL = `prov.p2.${TS}@servmate.test`;
const ADMIN_EMAIL    = `admin.p2.${TS}@servmate.test`;

// ── HTTP helpers ───────────────────────────────────────────────────
const req = (method, url, body, token) => fetch(url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});
const POST  = (u, b, t) => req('POST',  u, b, t);
const GET   = (u, t)    => req('GET',   u, undefined, t);
const PATCH = (u, b, t) => req('PATCH', u, b, t);
const PUT   = (u, b, t) => req('PUT',   u, b, t);

// ── Setup / Teardown ──────────────────────────────────────────────
before(async () => {
  server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  baseUrl = `http://localhost:${server.address().port}/api/v1`;
});

after(async () => {
  // Cleanup in FK dependency order
  await prisma.booking.deleteMany({ where: { customer: { email: { contains: `.p2.${TS}@` } } } });
  await prisma.availability.deleteMany({ where: { provider: { user: { email: PROVIDER_EMAIL } } } });
  await prisma.providerService.deleteMany({ where: { provider: { user: { email: PROVIDER_EMAIL } } } });
  await prisma.provider.deleteMany({ where: { user: { email: PROVIDER_EMAIL } } });
  await prisma.user.deleteMany({ where: { email: { contains: `.p2.${TS}@` } } });
  await prisma.$disconnect();
  await new Promise((res) => server.close(res));
});

// ══════════════════════════════════════════════════════════════════
// SEQUENTIAL SUITE
// Using a single top-level test with awaited subtests ensures
// tests run one-by-one and shared state (tokens, IDs) is safe.
// ══════════════════════════════════════════════════════════════════
test('Phase 2 Integration Suite', async (t) => {
  // Shared state (populated as tests progress)
  let customerToken, providerToken, adminToken;
  let providerProfileId, serviceCategoryId, availabilityId, bookingId;
  const futureDate = new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString().split('T')[0];

  // ── Bootstrap users ──────────────────────────────────────────────
  const custRes = await (await POST(`${baseUrl}/auth/register`, {
    name: 'P2 Customer', email: CUSTOMER_EMAIL, password: 'Pass1234!', role: 'CUSTOMER',
  })).json();
  customerToken = custRes.data.token;

  const provRes = await (await POST(`${baseUrl}/auth/register`, {
    name: 'P2 Provider', email: PROVIDER_EMAIL, password: 'Pass1234!', role: 'PROVIDER',
  })).json();
  providerToken = provRes.data.token;

  await prisma.user.create({
    data: { name: 'P2 Admin', email: ADMIN_EMAIL, password: await bcrypt.hash('Pass1234!', 10), role: 'ADMIN' },
  });
  const adminRes = await (await POST(`${baseUrl}/auth/login`, { email: ADMIN_EMAIL, password: 'Pass1234!' })).json();
  adminToken = adminRes.data.token;

  // ═══════════════════════════════════════════════════
  // 1. SERVICE CATEGORIES
  // ═══════════════════════════════════════════════════
  await t.test('1. GET /services — returns active categories', async () => {
    const res = await GET(`${baseUrl}/services`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.services.length > 0, 'Should have at least 1 category');
    serviceCategoryId = data.data.services[0].id;
  });

  await t.test('2. GET /services/:id — returns single category', async () => {
    const res = await GET(`${baseUrl}/services/${serviceCategoryId}`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.service.id, serviceCategoryId);
  });

  // ═══════════════════════════════════════════════════
  // 2. PROVIDER PROFILE
  // ═══════════════════════════════════════════════════
  await t.test('3. POST /providers/profile — provider creates profile', async () => {
    const res = await POST(`${baseUrl}/providers/profile`, {
      bio: 'Experienced plumber with 8 years working in residential plumbing.',
      experienceYears: 8, hourlyRate: 500, city: 'Mumbai', state: 'Maharashtra',
      latitude: 19.0760, longitude: 72.8777,
    }, providerToken);
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.data.provider.verificationStatus, 'PENDING');
    providerProfileId = data.data.provider.id;
  });

  await t.test('4. POST /providers/profile — customer gets 403', async () => {
    const res = await POST(`${baseUrl}/providers/profile`, {
      bio: 'Unauthorized customer trying to create provider profile.',
    }, customerToken);
    assert.equal(res.status, 403);
  });

  await t.test('5. PUT /providers/profile/me — provider updates profile', async () => {
    const res = await PUT(`${baseUrl}/providers/profile/me`, {
      hourlyRate: 600, experienceYears: 9,
    }, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.provider.hourlyRate, 600);
  });

  await t.test('6. GET /providers/profile/me — provider views own profile', async () => {
    const res = await GET(`${baseUrl}/providers/profile/me`, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.provider.id);
  });

  // ═══════════════════════════════════════════════════
  // 3. PROVIDER SERVICES
  // ═══════════════════════════════════════════════════
  await t.test('7. PUT /providers/services — provider sets service categories', async () => {
    const res = await PUT(`${baseUrl}/providers/services`, {
      serviceCategoryIds: [serviceCategoryId],
    }, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.services.length, 1);
  });

  // ═══════════════════════════════════════════════════
  // 4. VERIFICATION
  // ═══════════════════════════════════════════════════
  await t.test('8. GET /providers/pending — admin lists pending providers', async () => {
    const res = await GET(`${baseUrl}/providers/pending`, adminToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.providers.length >= 1);
  });

  await t.test('9. GET /providers/pending — customer gets 403', async () => {
    const res = await GET(`${baseUrl}/providers/pending`, customerToken);
    assert.equal(res.status, 403);
  });

  await t.test('10. GET /providers — PENDING provider not in public list', async () => {
    const res = await GET(`${baseUrl}/providers`);
    const data = await res.json();
    assert.equal(res.status, 200);
    const found = data.data.providers.some((p) => p.id === providerProfileId);
    assert.equal(found, false, 'PENDING provider must NOT appear in public discovery');
  });

  await t.test('11. PATCH /providers/:id/approve — admin approves provider', async () => {
    const res = await PATCH(`${baseUrl}/providers/${providerProfileId}/approve`, {}, adminToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.provider.verificationStatus, 'APPROVED');
  });

  await t.test('12. GET /providers — APPROVED provider in public list', async () => {
    const res = await GET(`${baseUrl}/providers`);
    const data = await res.json();
    assert.equal(res.status, 200);
    const found = data.data.providers.some((p) => p.id === providerProfileId);
    assert.equal(found, true, 'APPROVED provider must appear in public discovery');
  });

  // ═══════════════════════════════════════════════════
  // 5. AVAILABILITY
  // ═══════════════════════════════════════════════════
  await t.test('13. POST /availability — provider adds time slot', async () => {
    const res = await POST(`${baseUrl}/availability`, {
      dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00',
    }, providerToken);
    const data = await res.json();
    assert.equal(res.status, 201);
    availabilityId = data.data.slot.id;
  });

  await t.test('14. POST /availability — duplicate slot rejected', async () => {
    const res = await POST(`${baseUrl}/availability`, {
      dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00',
    }, providerToken);
    assert.ok([400, 409, 500].includes(res.status), `Expected 400/409/500 for duplicate, got ${res.status}`);
  });

  await t.test('15. POST /availability — invalid time range rejected', async () => {
    const res = await POST(`${baseUrl}/availability`, {
      dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '09:00',
    }, providerToken);
    assert.equal(res.status, 400);
  });

  await t.test('16. GET /availability/my — customer gets 403', async () => {
    const res = await GET(`${baseUrl}/availability/my`, customerToken);
    assert.equal(res.status, 403);
  });

  // ═══════════════════════════════════════════════════
  // 6. SMART MATCHING
  // ═══════════════════════════════════════════════════
  await t.test('17. GET /providers/match — returns matches with score and reasons', async () => {
    const res = await GET(`${baseUrl}/providers/match?city=Mumbai`);
    const data = await res.json();
    assert.equal(res.status, 200);
    if (data.data.matches.length > 0) {
      assert.equal(typeof data.data.matches[0].matchScore, 'number');
      assert.ok(Array.isArray(data.data.matches[0].matchReasons));
    }
  });

  await t.test('18. GET /providers/match?serviceCategoryId — provider with service appears', async () => {
    const res = await GET(`${baseUrl}/providers/match?serviceCategoryId=${serviceCategoryId}`);
    const data = await res.json();
    assert.equal(res.status, 200);
    const found = data.data.matches.some((m) => m.provider.id === providerProfileId);
    assert.equal(found, true, 'Provider offering this service should appear in matches');
  });

  await t.test('19. Match scores are between 0 and 100', async () => {
    const res = await GET(`${baseUrl}/providers/match?city=Mumbai`);
    const data = await res.json();
    assert.equal(res.status, 200);
    data.data.matches.forEach((m) => {
      assert.ok(m.matchScore >= 0 && m.matchScore <= 100, `Score ${m.matchScore} out of range`);
    });
  });

  // ═══════════════════════════════════════════════════
  // 7. BOOKINGS
  // ═══════════════════════════════════════════════════
  await t.test('20. POST /bookings — customer creates booking', async () => {
    const res = await POST(`${baseUrl}/bookings`, {
      providerId: providerProfileId,
      serviceCategoryId,
      bookingDate: futureDate,
      startTime: '09:00',
      endTime: '10:00',
      serviceAddress: '123 Test Street, Mumbai',
      city: 'Mumbai',
    }, customerToken);
    const data = await res.json();
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.equal(data.data.booking.status, 'PENDING');
    bookingId = data.data.booking.id;
  });

  await t.test('21. POST /bookings — double-booking rejected with 409', async () => {
    const c2Res = await (await POST(`${baseUrl}/auth/register`, {
      name: 'Second Customer', email: `cust2.p2.${TS}@servmate.test`, password: 'Pass1234!', role: 'CUSTOMER',
    })).json();
    const res = await POST(`${baseUrl}/bookings`, {
      providerId: providerProfileId,
      serviceCategoryId,
      bookingDate: futureDate,
      startTime: '09:00',
      endTime: '10:00',
      serviceAddress: '456 Other Street, Mumbai',
    }, c2Res.data.token);
    assert.equal(res.status, 409, 'Double-booking must return 409 Conflict');
  });

  await t.test('22. GET /bookings/provider — provider sees incoming bookings', async () => {
    const res = await GET(`${baseUrl}/bookings/provider`, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.bookings.length >= 1);
  });

  await t.test('23. PATCH /bookings/:id/accept — provider accepts booking', async () => {
    const res = await PATCH(`${baseUrl}/bookings/${bookingId}/accept`, {}, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert.equal(data.data.booking.status, 'CONFIRMED');
  });

  await t.test('24. GET /bookings/my — customer views own bookings', async () => {
    const res = await GET(`${baseUrl}/bookings/my`, customerToken);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.bookings.some((b) => b.id === bookingId));
  });

  await t.test('25. GET /bookings/:id — different customer gets 403', async () => {
    const c3Res = await (await POST(`${baseUrl}/auth/register`, {
      name: 'Third Customer', email: `cust3.p2.${TS}@servmate.test`, password: 'Pass1234!', role: 'CUSTOMER',
    })).json();
    const res = await GET(`${baseUrl}/bookings/${bookingId}`, c3Res.data.token);
    assert.equal(res.status, 403);
  });

  await t.test('26. PATCH /bookings/:id/complete — provider marks complete', async () => {
    const res = await PATCH(`${baseUrl}/bookings/${bookingId}/complete`, {}, providerToken);
    const data = await res.json();
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert.equal(data.data.booking.status, 'COMPLETED');
  });
});
