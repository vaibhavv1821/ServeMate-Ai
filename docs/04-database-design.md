# 04 - Database Design

**Current Phase Status**: Implemented (Phase 1 Initial Prisma Schema Setup)

---

## 1. Relational Database Selection: PostgreSQL (Neon)

ServMate requires strict ACID compliance for financial transactions, bookings, user profiles, and verification states. PostgreSQL hosted on Neon provides serverless scaling, point-in-time recovery, and reliable cloud connections.

---

## 2. Core Entities & Prisma Schema (Phase 1 Baseline)

### User & Verification Entities
```prisma
enum Role {
  CUSTOMER
  PROVIDER
  ADMIN
}

enum ServiceStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  fullName  String
  phone     String?
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 3. Planned Models (`STATUS: PLANNED`)
- `ProviderProfile`: Provider specialization, experience years, hourly rate, verification status, geolocation (latitude, longitude).
- `ServiceCategory`: Catalog of service categories (Electrician, Plumber, Appliance, Cleaning).
- `Booking`: Customer service bookings, scheduled time, OTP start verification code, status, price.
- `ServiceProof`: Before and after service completion images stored on Cloudinary.
- `Review`: Star ratings (1-5) and feedback left by customers for service providers.
