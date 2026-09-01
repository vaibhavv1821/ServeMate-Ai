import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api/v1/auth`;

  // Clean up any test users from prior runs
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'customer.test@servmate.com',
          'provider.test@servmate.com',
          'admin.test@servmate.com',
          'inactive.test@servmate.com',
          'dup.test@servmate.com',
        ],
      },
    },
  });
});

after(async () => {
  // Clean up test users after runs
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'customer.test@servmate.com',
          'provider.test@servmate.com',
          'admin.test@servmate.com',
          'inactive.test@servmate.com',
          'dup.test@servmate.com',
        ],
      },
    },
  });
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
});

const makeRequest = async (path, method = 'GET', body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

describe('Phase 1 Auth Integration Test Suite (Neon PostgreSQL)', () => {
  let customerToken;
  let providerToken;
  let adminToken;
  let customerUser;

  test('1. Customer registration succeeds', async () => {
    const res = await makeRequest('/register', 'POST', {
      name: 'John Customer',
      email: 'customer.test@servmate.com',
      password: 'Password123!',
      role: 'CUSTOMER',
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.status, 'success');
    assert.equal(res.data.data.user.role, 'CUSTOMER');
    assert.ok(res.data.data.token);
    assert.equal(res.data.data.user.password, undefined);

    customerToken = res.data.data.token;
    customerUser = res.data.data.user;
  });

  test('2. Provider registration succeeds', async () => {
    const res = await makeRequest('/register', 'POST', {
      name: 'Alice Provider',
      email: 'provider.test@servmate.com',
      password: 'Password123!',
      role: 'PROVIDER',
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.status, 'success');
    assert.equal(res.data.data.user.role, 'PROVIDER');
    providerToken = res.data.data.token;
  });

  test('3. Public Admin registration is rejected', async () => {
    const res = await makeRequest('/register', 'POST', {
      name: 'Hacker Admin',
      email: 'admin.test@servmate.com',
      password: 'Password123!',
      role: 'ADMIN',
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.status, 'error');
  });

  test('4. Duplicate email registration is rejected', async () => {
    const res = await makeRequest('/register', 'POST', {
      name: 'John Clone',
      email: 'customer.test@servmate.com',
      password: 'Password123!',
      role: 'CUSTOMER',
    });

    assert.equal(res.status, 409);
    assert.match(res.data.message, /already exists/i);
  });

  test('5. Password is stored as bcrypt hash in database', async () => {
    const dbUser = await prisma.user.findUnique({
      where: { email: 'customer.test@servmate.com' },
    });

    assert.ok(dbUser);
    assert.notEqual(dbUser.password, 'Password123!');
    assert.ok(dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$'));
    assert.ok(await bcrypt.compare('Password123!', dbUser.password));
  });

  test('6 & 8. Successful login returns JWT token and safe user payload', async () => {
    const res = await makeRequest('/login', 'POST', {
      email: 'customer.test@servmate.com',
      password: 'Password123!',
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'success');
    assert.ok(res.data.data.token);
    assert.equal(res.data.data.user.email, 'customer.test@servmate.com');
    assert.equal(res.data.data.user.password, undefined);
  });

  test('7. Invalid login credentials rejected', async () => {
    const res = await makeRequest('/login', 'POST', {
      email: 'customer.test@servmate.com',
      password: 'WrongPassword!',
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.status, 'error');
    assert.equal(res.data.message, 'Invalid email address or password');
  });

  test('9. /auth/me requires authentication header', async () => {
    const res = await makeRequest('/me', 'GET');
    assert.equal(res.status, 401);
  });

  test('10. Valid JWT works for /auth/me', async () => {
    const res = await makeRequest('/me', 'GET', null, customerToken);
    assert.equal(res.status, 200);
    assert.equal(res.data.data.user.email, 'customer.test@servmate.com');
  });

  test('11. Invalid JWT is rejected', async () => {
    const res = await makeRequest('/me', 'GET', null, 'invalid_garbage_token');
    assert.equal(res.status, 401);
  });

  test('12. Expired JWT is rejected', async () => {
    const expiredToken = jwt.sign(
      { id: customerUser.id, role: 'CUSTOMER' },
      process.env.JWT_SECRET || 'servmate_super_secret_jwt_key_placement_ready_2026',
      { expiresIn: '-1s' }
    );

    const res = await makeRequest('/me', 'GET', null, expiredToken);
    assert.equal(res.status, 401);
    assert.match(res.data.message, /expired/i);
  });

  test('13, 14 & 15. Role authorization middleware checks', async () => {
    // Create Admin user manually in DB for authorization testing
    const hashedAdminPass = await bcrypt.hash('AdminPassword123!', 10);
    const adminUser = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin.test@servmate.com',
        password: hashedAdminPass,
        role: 'ADMIN',
      },
    });
    adminToken = jwt.sign(
      { id: adminUser.id, role: 'ADMIN' },
      process.env.JWT_SECRET || 'servmate_super_secret_jwt_key_placement_ready_2026',
      { expiresIn: '1h' }
    );

    // Customer route verification
    const custOnCust = await makeRequest('/test/customer', 'GET', null, customerToken);
    assert.equal(custOnCust.status, 200);

    const provOnCust = await makeRequest('/test/customer', 'GET', null, providerToken);
    assert.equal(provOnCust.status, 403);

    // Provider route verification
    const provOnProv = await makeRequest('/test/provider', 'GET', null, providerToken);
    assert.equal(provOnProv.status, 200);

    const custOnProv = await makeRequest('/test/provider', 'GET', null, customerToken);
    assert.equal(custOnProv.status, 403);

    // Admin route verification
    const adminOnAdmin = await makeRequest('/test/admin', 'GET', null, adminToken);
    assert.equal(adminOnAdmin.status, 200);

    const custOnAdmin = await makeRequest('/test/admin', 'GET', null, customerToken);
    assert.equal(custOnAdmin.status, 403);
  });

  test('16. Deactivated/inactive user is rejected', async () => {
    const hashedPass = await bcrypt.hash('Password123!', 10);
    const inactiveUser = await prisma.user.create({
      data: {
        name: 'Inactive User',
        email: 'inactive.test@servmate.com',
        password: hashedPass,
        role: 'CUSTOMER',
        isActive: false,
      },
    });

    const inactiveToken = jwt.sign(
      { id: inactiveUser.id, role: 'CUSTOMER' },
      process.env.JWT_SECRET || 'servmate_super_secret_jwt_key_placement_ready_2026',
      { expiresIn: '1h' }
    );

    const res = await makeRequest('/me', 'GET', null, inactiveToken);
    assert.equal(res.status, 403);
    assert.match(res.data.message, /deactivated/i);
  });
});
