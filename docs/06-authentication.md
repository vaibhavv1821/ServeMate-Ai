# Chapter 6: Authentication & Authorization System

## Overview
ServMate implements a stateless, token-based authentication system using **JSON Web Tokens (JWT)**, **bcryptjs password hashing**, and **Zod schema validation**.

## Architecture & Flows

### 1. User Registration Flow (`POST /api/v1/auth/register`)
- **Public Roles Allowed**: `CUSTOMER` and `PROVIDER`.
- **Public Admin Block**: Registration requests specifying `role: "ADMIN"` are rejected (400 Bad Request).
- **Validation**: Zod schema validates email syntax, phone format, and password length ($\ge 6$ characters).
- **Password Security**: Passwords are salted and hashed using `bcryptjs` ($10$ rounds) before database storage.
- **Response**: Returns JWT token and user object. Password hash is explicitly omitted (`select` clause).

### 2. User Login Flow (`POST /api/v1/auth/login`)
- **Credentials Check**: Verifies email existence and compares password hash using `bcrypt.compare`.
- **Generic Errors**: Returns standard `401 Unauthorized` ("Invalid email address or password") to prevent user enumeration attacks.
- **Status Check**: Deactivated users (`isActive: false`) are rejected with `403 Forbidden`.
- **JWT Payload**: Claims include `id` and `role`. Expiration default: `7d`.

### 3. Role-Based Authorization Middleware (`authorizeRoles`)
- Restricts API routes based on user role (`CUSTOMER`, `PROVIDER`, `ADMIN`).
- Unauthenticated requests $\to$ `401 Unauthorized`.
- Unauthorized roles $\to$ `403 Forbidden`.

## Logout Design Decision
JWT is stateless. Logout is executed on the client-side by purging the token from `localStorage` and clearing the `Authorization` header. Server-side token blacklisting is marked as `STATUS: PLANNED (PHASE 2)`.
