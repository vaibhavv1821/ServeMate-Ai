# 05 - API Documentation

**Current Phase Status**: Implemented (Phase 1 Baseline Endpoints)

---

## 1. Implemented Endpoints (Phase 1)

### `GET /api/v1/health`
- **Purpose**: System health check endpoint for uptime monitoring and deployment verification.
- **Authentication**: None Required
- **Authorization**: Public
- **Request Body**: None
- **Query Parameters**: None
- **Success Response** (`200 OK`):
  ```json
  {
    "status": "success",
    "message": "ServMate API is healthy and operational",
    "timestamp": "2026-08-20T12:00:00.000Z",
    "environment": "development"
  }
  ```

---

## 2. Planned API Specification (`STATUS: PLANNED`)

### Auth Module (`STATUS: PLANNED`)
- `POST /api/v1/auth/register`: Register new Customer/Provider
- `POST /api/v1/auth/login`: User authentication & JWT issue

### Provider Module (`STATUS: PLANNED`)
- `POST /api/v1/providers/profile`: Create/update service provider profile
- `GET /api/v1/providers/search`: Smart search and proximity matching

### Booking Module (`STATUS: PLANNED`)
- `POST /api/v1/bookings`: Create booking request
- `POST /api/v1/bookings/:id/verify-otp`: Service start OTP verification
