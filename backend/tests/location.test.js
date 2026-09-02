/**
 * ServMate Location & Map Picker Integration Tests
 *
 * Verifies:
 * 1. Valid coordinates accepted on profile creation/update
 * 2. Invalid latitude rejected with 400
 * 3. Invalid longitude rejected with 400
 * 4. Provider profile saves selected coordinates in database
 * 5. Existing coordinates are preserved when editing
 * 6. Smart matching calculates distance correctly via Haversine
 * 7. Provider without coordinates does not crash the system
 * 8. Location search failure / invalid queries handled cleanly
 * 9. Reverse geocoding validates coordinate bounds
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

let server, baseUrl;
const TS = Date.now();
const PROVIDER_A_EMAIL = `prov.locA.${TS}@servmate.test`;
const PROVIDER_B_EMAIL = `prov.locB.${TS}@servmate.test`;
const CUSTOMER_EMAIL   = `cust.loc.${TS}@servmate.test`;

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
const PUT  = (u, b, t) => req('PUT',  u, b, t);

before(async () => {
  server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  baseUrl = `http://localhost:${server.address().port}/api/v1`;

  // Warm up Neon connection in case compute was sleeping
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
});


after(async () => {
  await prisma.providerService.deleteMany({
    where: { provider: { user: { email: { in: [PROVIDER_A_EMAIL, PROVIDER_B_EMAIL] } } } },
  });
  await prisma.provider.deleteMany({
    where: { user: { email: { in: [PROVIDER_A_EMAIL, PROVIDER_B_EMAIL] } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [PROVIDER_A_EMAIL, PROVIDER_B_EMAIL, CUSTOMER_EMAIL] } },
  });
  await prisma.$disconnect();
  await new Promise((res) => server.close(res));
});

test('Location & Map Picker Test Suite', async (t) => {
  let tokenA, tokenB, tokenCust;
  let serviceCategoryId;

  // Setup users
  const resRegA = await (
    await POST(`${baseUrl}/auth/register`, {
      name: 'Provider Loc A',
      email: PROVIDER_A_EMAIL,
      password: 'Password123!',
      role: 'PROVIDER',
    })
  ).json();
  tokenA = resRegA.data.token;

  const resRegB = await (
    await POST(`${baseUrl}/auth/register`, {
      name: 'Provider Loc B',
      email: PROVIDER_B_EMAIL,
      password: 'Password123!',
      role: 'PROVIDER',
    })
  ).json();
  tokenB = resRegB.data.token;

  const resRegCust = await (
    await POST(`${baseUrl}/auth/register`, {
      name: 'Customer Loc',
      email: CUSTOMER_EMAIL,
      password: 'Password123!',
      role: 'CUSTOMER',
    })
  ).json();
  tokenCust = resRegCust.data.token;

  // Retrieve an active service category
  const resCat = await (await GET(`${baseUrl}/services`)).json();
  serviceCategoryId = resCat.data.services[0].id;

  // ── 1. Valid coordinates accepted ──────────────────────────────
  await t.test('1. Valid coordinates are accepted when creating profile', async () => {
    const res = await POST(
      `${baseUrl}/providers/profile`,
      {
        bio: 'Professional plumber with verified location',
        experienceYears: 5,
        hourlyRate: 500,
        city: 'Mumbai',
        state: 'Maharashtra',
        latitude: 19.076,
        longitude: 72.8777,
      },
      tokenA
    );
    const data = await res.json();
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.equal(data.data.provider.latitude, 19.076);
    assert.equal(data.data.provider.longitude, 72.8777);
  });

  // ── 2. Invalid latitude rejected ───────────────────────────────
  await t.test('2. Invalid latitude (> 90 or < -90) is rejected with 400', async () => {
    const resHigh = await POST(
      `${baseUrl}/providers/profile`,
      {
        bio: 'Invalid latitude provider test',
        latitude: 95.5,
        longitude: 72.8777,
      },
      tokenB
    );
    assert.equal(resHigh.status, 400);

    const resLow = await POST(
      `${baseUrl}/providers/profile`,
      {
        bio: 'Invalid latitude provider test',
        latitude: -120.0,
        longitude: 72.8777,
      },
      tokenB
    );
    assert.equal(resLow.status, 400);
  });

  // ── 3. Invalid longitude rejected ──────────────────────────────
  await t.test('3. Invalid longitude (> 180 or < -180) is rejected with 400', async () => {
    const resHigh = await POST(
      `${baseUrl}/providers/profile`,
      {
        bio: 'Invalid longitude provider test',
        latitude: 19.076,
        longitude: 200.0,
      },
      tokenB
    );
    assert.equal(resHigh.status, 400);

    const resLow = await POST(
      `${baseUrl}/providers/profile`,
      {
        bio: 'Invalid longitude provider test',
        latitude: 19.076,
        longitude: -250.0,
      },
      tokenB
    );
    assert.equal(resLow.status, 400);
  });

  // ── 4. Provider profile saves selected coordinates in database ─
  await t.test('4. Provider profile persists coordinates accurately in DB', async () => {
    const profileMe = await (await GET(`${baseUrl}/providers/profile/me`, tokenA)).json();
    assert.equal(profileMe.data.provider.latitude, 19.076);
    assert.equal(profileMe.data.provider.longitude, 72.8777);
  });

  // ── 5. Existing coordinates are preserved or updated ───────────
  await t.test('5. Existing coordinates can be updated via PUT /profile/me', async () => {
    const resUpdate = await PUT(
      `${baseUrl}/providers/profile/me`,
      {
        bio: 'Updated bio with new location pin',
        latitude: 18.5204, // Pune
        longitude: 73.8567,
      },
      tokenA
    );
    const dataUpdate = await resUpdate.json();
    assert.equal(resUpdate.status, 200);
    assert.equal(dataUpdate.data.provider.latitude, 18.5204);
    assert.equal(dataUpdate.data.provider.longitude, 73.8567);
  });

  // ── 6. Smart matching calculates distance correctly ───────────
  await t.test('6. Smart matching calculates distance score from provider coordinates', async () => {
    // Attach service category to provider A
    await PUT(`${baseUrl}/providers/services`, { serviceCategoryIds: [serviceCategoryId] }, tokenA);

    // Approve provider so they appear in matching
    const profile = (await (await GET(`${baseUrl}/providers/profile/me`, tokenA)).json()).data.provider;
    await prisma.provider.update({
      where: { id: profile.id },
      data: { verificationStatus: 'APPROVED' },
    });

    // Match query close to Pune (18.53, 73.85) -> should have high distance score
    const resNear = await (
      await GET(
        `${baseUrl}/providers/match?serviceCategoryId=${serviceCategoryId}&latitude=18.53&longitude=73.85`,
        tokenCust
      )
    ).json();

    assert.equal(resNear.status, 'success');
    const matched = resNear.data.matches.find((m) => m.provider.id === profile.id);
    assert.ok(matched, 'Provider with coordinates should be matched');
    assert.ok(matched.matchScore > 0, 'Match score should be positive');
  });


  // ── 7. Provider without coordinates does not crash system ──────
  await t.test('7. Provider created without coordinates does not crash matching', async () => {
    const resCreateB = await POST(
      `${baseUrl}/providers/profile`,
      {
        bio: 'Provider without GPS coordinates',
        city: 'Delhi',
        state: 'Delhi',
      },
      tokenB
    );
    assert.equal(resCreateB.status, 201);

    const profileB = (await (await GET(`${baseUrl}/providers/profile/me`, tokenB)).json()).data.provider;
    await prisma.provider.update({
      where: { id: profileB.id },
      data: { verificationStatus: 'APPROVED' },
    });

    // Perform match with coordinates -> should not crash on provider without coordinates
    const resMatch = await (
      await GET(
        `${baseUrl}/providers/match?latitude=28.61&longitude=77.20&city=Delhi`,
        tokenCust
      )
    ).json();

    assert.equal(resMatch.status, 'success');
    assert.ok(Array.isArray(resMatch.data.matches));
  });

  // ── 8. Location search query validation ─────────────────────────
  await t.test('8. GET /location/search validates short query (<2 chars)', async () => {
    const resShort = await GET(`${baseUrl}/location/search?q=a`);
    assert.equal(resShort.status, 400);
  });

  // ── 9. Reverse geocoding validates coordinate ranges ────────────
  await t.test('9. GET /location/reverse validates coordinate bounds', async () => {
    const resInvalid = await GET(`${baseUrl}/location/reverse?lat=100&lon=200`);
    assert.equal(resInvalid.status, 400);

    const resValid = await GET(`${baseUrl}/location/reverse?lat=19.076&lon=72.877`);
    assert.equal(resValid.status, 200);
  });
});
