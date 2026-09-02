# ServMate — Service Verification System (Phase 3)

## Purpose

The service-start OTP verification ensures that the **customer and provider are physically together** before service begins, preventing fraudulent service claims.

---

## OTP Flow

```
Booking CONFIRMED
        ↓
Customer opens booking → taps "Generate Service OTP"
        ↓
Backend generates 6-digit OTP via crypto.randomInt()
        ↓
OTP stored in Redis with 5-minute TTL
        ↓
Customer shows OTP on screen to provider (verbal share)
        ↓
Provider enters 6 digits in their app → hits "Verify OTP"
        ↓
Backend verifies:
  - OTP exists in Redis (not expired)
  - OTP matches stored value
  - Attempt count < 5
        ↓
OTP deleted from Redis (one-time use)
        ↓
Booking status → SERVICE_STARTED
        ↓
Real-time socket event sent to both parties
```

---

## Security Details

| Property | Implementation |
|----------|---------------|
| Generation | `crypto.randomInt(100000, 999999)` — cryptographically random |
| Length | 6 digits |
| Storage | Redis only (never PostgreSQL) |
| Expiry | 5-minute TTL via Redis `EX` parameter |
| Max attempts | 5 per OTP — exceeded → OTP deleted |
| Rate limit | Max 3 OTP generations per customer per minute |
| One-time use | Deleted immediately upon successful verification |
| Role enforcement | Only CUSTOMER can generate; only PROVIDER can verify |
| Booking ownership | Provider can only verify OTP for bookings assigned to them |

---

## Redis Key Schema

```
otp:{bookingId}       →  JSON { otp: "123456", attempts: 0 }
                          TTL: 300 seconds

otp_gen:{userId}      →  integer (count)
                          TTL: 60 seconds (rate limit window)
```

---

## Booking Status Lifecycle (Extended)

```
PENDING
    ↓ (provider accepts)
CONFIRMED
    ↓ (customer generates OTP → provider verifies)
SERVICE_STARTED
    ↓ (provider marks complete)
COMPLETED

Alternative paths:
PENDING → REJECTED      (provider rejects)
PENDING → CANCELLED     (customer cancels)
CONFIRMED → CANCELLED   (customer cancels)
```

All invalid transitions are blocked on the backend with HTTP 400.

---

## API Endpoints

### Generate OTP
```
POST /api/v1/bookings/:id/otp/generate
Authorization: Bearer {customerToken}
Role: CUSTOMER

Response 200:
{
  "status": "success",
  "data": {
    "otp": "482951",
    "expiresInSeconds": 300,
    "note": "⚠️ Dev/Demo mode — display only on customer device"
  }
}
```

### Verify OTP
```
POST /api/v1/bookings/:id/otp/verify
Authorization: Bearer {providerToken}
Role: PROVIDER

Body: { "otp": "482951" }

Response 200:
{
  "status": "success",
  "data": { "booking": { "id": "...", "status": "SERVICE_STARTED" } }
}
```

---

## What Happens If Redis is Unavailable

- `getRedis()` throws a structured error with `statusCode: 503`
- The error propagates through the Express error handler
- Client receives `503 Service Unavailable` with a descriptive message
- Application does NOT silently pretend Redis is working
- All other endpoints (REST, auth, bookings) continue to function normally

---

## Development / Demo Note

In development, the OTP is returned to the customer in the API response for convenience. In production, this should only be displayed on the customer's device screen and never transmitted via network to anyone other than the customer.
