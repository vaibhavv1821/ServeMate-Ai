# ServMate — Redis Integration (Phase 3)

## Why Redis?

PostgreSQL is the **source of truth** for all persistent data in ServMate. Redis is used exclusively for **ephemeral, time-sensitive data** where:

1. Automatic expiration (TTL) is required
2. Data must not persist beyond its validity window
3. Fast read/write latency is important
4. Persistence is NOT desired (OTPs should disappear after use)

---

## Redis Provider: Upstash

ServMate uses **Upstash Redis** — a serverless, REST-based Redis service that requires no TCP connection or local installation.

- **Client library:** `@upstash/redis` (npm)
- **Connection:** HTTPS REST API (no TCP socket)
- **Credentials:** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- **Free tier:** 10,000 requests/day

---

## Key Schema

| Key Pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `otp:{bookingId}` | `JSON { otp: "123456", attempts: 0 }` | 300s (5 min) | Service start OTP |
| `otp_gen:{userId}` | integer (count) | 60s | OTP generation rate limit |
| `test:{any}` | any | varies | Integration test verification |

---

## OTP Storage

```javascript
// Store
await redis.set(`otp:${bookingId}`, JSON.stringify({ otp, attempts: 0 }), { ex: 300 });

// Retrieve
const stored = await redis.get(`otp:${bookingId}`);
const data = JSON.parse(stored); // { otp: "482951", attempts: 1 }

// Delete (after use)
await redis.del(`otp:${bookingId}`);
```

---

## Rate Limiting

### OTP Generation Rate Limit

Prevents a customer from flooding OTP generation requests.

```javascript
const key = `otp_gen:${userId}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60); // 60-second window
if (count > 3) throw new AppError('Too many OTP requests', 429);
```

| Parameter | Value |
|-----------|-------|
| Window | 60 seconds |
| Max requests | 3 per window |
| Key structure | `otp_gen:{userId}` |
| HTTP response on breach | 429 Too Many Requests |

---

## Failure Handling

If Redis is unavailable (network issue, quota exceeded):

1. `getRedis()` throws a structured error: `{ message: 'Redis unavailable', statusCode: 503 }`
2. Error propagates through Express error handler
3. Client receives `503 Service Unavailable`
4. All non-Redis endpoints (auth, bookings, providers, etc.) continue normally
5. OTP operations are **blocked** — they do not silently succeed

```javascript
export const getRedis = () => {
  if (!redis) {
    const err = new Error('Redis unavailable — cannot complete this operation');
    err.statusCode = 503;
    throw err;
  }
  return redis;
};
```

---

## PostgreSQL vs Redis — When to Use Which

| Data | Storage | Reason |
|------|---------|--------|
| User accounts | PostgreSQL | Permanent, needs relationships |
| Bookings | PostgreSQL | Permanent business records |
| Messages | PostgreSQL | Permanent conversation history |
| Reviews | PostgreSQL | Permanent, affects provider rating |
| Service proof | PostgreSQL (metadata) | Permanent evidence |
| OTP | **Redis** | Must expire; one-time use |
| Rate limit counters | **Redis** | Time-windowed, ephemeral |
| Session data | Neither (JWT stateless) | Stateless auth |

---

## Interview Q&A

**Q: Why not store OTPs in PostgreSQL?**  
A: PostgreSQL doesn't support automatic row expiration. We would need a scheduled cleanup job. Redis TTL handles expiration atomically and automatically, which is the correct tool for ephemeral data.

**Q: What if Redis goes down?**  
A: OTP operations fail with 503. All other features (auth, booking management, messaging, reviews) continue working because they don't depend on Redis.

**Q: Why Upstash instead of local Redis?**  
A: Upstash is serverless, requires no local install, works identically in development and production, and has a free tier sufficient for this project.
