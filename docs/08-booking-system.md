# 08 – Booking System

## Overview

ServMate's booking system is a transactional, conflict-safe workflow that connects customers to verified providers for specific service categories. It is built on top of the Provider Smart Matching engine (Phase 2) and has been extended in Phase 4 to support **Emergency Mode**, **AI metadata storage**, and **Backup Provider Resilience**.

---

## Booking Lifecycle

```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
         ↓
       REJECTED  →  (Backup Provider Reassignment)
         ↓
       CANCELLED
```

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting provider acceptance |
| `CONFIRMED` | Provider accepted — OTP issued for service start |
| `REJECTED` | Provider declined — customer can request backup providers |
| `CANCELLED` | Cancelled by customer before completion |
| `COMPLETED` | Service delivered and marked complete |

---

## Core Booking Fields

```prisma
model Booking {
  id               String          @id @default(uuid())
  customerId       String
  providerId       String
  serviceCategoryId String
  bookingDate      DateTime
  startTime        String
  endTime          String
  serviceAddress   String
  city             String
  status           BookingStatus   @default(PENDING)
  notes            String?

  // Phase 4 — Emergency Mode & AI Metadata
  urgency          Urgency         @default(NORMAL)
  isEmergency      Boolean         @default(false)
  aiCategory       String?
  aiSuggestedIssue String?
  aiSuggestedUrgency String?
  aiConfidence     Float?
  backupProviderId String?         // stores original provider ID after backup reassignment
}

enum Urgency {
  NORMAL
  URGENT
  EMERGENCY
}
```

---

## Double-Booking Prevention

Prisma enforces a unique composite constraint:

```prisma
@@unique([providerId, bookingDate, startTime, endTime])
```

On conflict, the API returns **409 Conflict**. All critical write operations are wrapped in a Prisma transaction with a 30-second timeout.

---

## Emergency Mode (Phase 4)

When a customer selects `urgency: 'EMERGENCY'`:

1. `isEmergency` is set to `true` in the database.
2. A real-time Socket.io event `emergency_booking_received` is emitted to the provider's room.
3. The Smart Matching engine applies **Emergency Priority Modifiers**:
   - **Availability bonus** (+15): provider has an open slot on the requested day/time.
   - **Proximity bonus** (+10): provider is within 5 km.

---

## Backup Provider Flow (Phase 4)

When a booking is `REJECTED`:

### Step 1 — Find Backup Candidates
```
GET /api/v1/bookings/:id/backup-candidates
Authorization: Bearer <customerToken>
```
Returns a ranked list of APPROVED providers who:
- Offer the same service category
- Have no scheduling conflicts (no existing PENDING/CONFIRMED booking at the same slot)
- Are not the original rejected provider

### Step 2 — Reassign
```
POST /api/v1/bookings/:id/reassign-backup
Authorization: Bearer <customerToken>
Body: { "backupProviderId": "<uuid>" }
```
The reassignment is performed inside a Prisma transaction:
1. Conflict check (double-booking prevention preserved).
2. `booking.providerId` → new backup provider.
3. `booking.backupProviderId` → original rejected provider (audit trail).
4. `booking.status` → `PENDING` (awaiting new provider's acceptance).
5. Socket.io event `booking_received` emitted to new provider.

---

## API Endpoints Summary

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/bookings` | CUSTOMER | Create a new booking |
| `GET` | `/api/v1/bookings/my` | CUSTOMER | View my bookings |
| `GET` | `/api/v1/bookings/provider` | PROVIDER | View received bookings |
| `PATCH` | `/api/v1/bookings/:id/accept` | PROVIDER | Accept a booking |
| `PATCH` | `/api/v1/bookings/:id/reject` | PROVIDER | Reject a booking |
| `PATCH` | `/api/v1/bookings/:id/cancel` | CUSTOMER | Cancel a booking |
| `GET` | `/api/v1/bookings/:id/backup-candidates` | CUSTOMER | List eligible backup providers |
| `POST` | `/api/v1/bookings/:id/reassign-backup` | CUSTOMER | Reassign to backup provider |
| `GET` | `/api/v1/bookings/admin` | ADMIN | View all bookings |
