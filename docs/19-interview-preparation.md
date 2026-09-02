# ServMate — Interview Preparation (Phase 1, 2 & 3)

## Phase 1 — Authentication & Authorization

**Q1: Why JWT over sessions?**  
JWT is stateless — no server-side session store needed. Each token contains the user ID and role, verified by the server with a secret key. This scales horizontally without sticky sessions.

**Q2: How does bcrypt hashing work?**  
bcrypt is a one-way adaptive hashing function. The salt is generated and embedded in the hash. Even if two users have the same password, their hashes differ due to unique salts. The `cost factor` (rounds) makes brute-force exponentially harder.

**Q3: How does role-based authorization work?**  
The JWT contains the user's `role`. The `authorizeRoles` middleware checks `req.user.role` against allowed roles for each route. If the role doesn't match, a 403 is returned before the controller runs.

---

## Phase 2 — Provider Marketplace & Booking

**Q4: How does double-booking prevention work?**  
Two layers: (1) An `@@unique([providerId, bookingDate, startTime, endTime])` schema constraint at the PostgreSQL level. (2) A `prisma.$transaction` check that queries for existing conflicting bookings before creating a new one. Both layers together prevent any race condition.

**Q5: How does the Haversine matching algorithm work?**  
Haversine calculates the great-circle distance between two GPS coordinates. It uses the law of haversines with Earth's radius (~6371 km) to compute distance without Euclidean approximation errors. The matching service uses it to score proximity between customer and provider.

**Q6: What are the 6 factors in the smart matching score?**  
Service match (30%), distance (20%), availability (20%), average rating (15%), experience (10%), hourly rate below average (5%). These weights are applied to give a transparent score between 0-100.

---

## Phase 3 — Real-Time, Redis, OTP, Reviews

**Q7: Why Socket.io instead of raw WebSockets?**  
Socket.io adds: (1) Automatic fallback to long-polling if WebSocket fails. (2) Built-in reconnection. (3) Room/namespace management. (4) Event-based API vs raw binary frames. For a real-time chat application, these features save significant development time.

**Q8: How does Socket.io authentication work?**  
The client sends the JWT in `socket.handshake.auth.token`. The server's `io.use()` middleware intercepts every connection attempt, verifies the token with `jwt.verify()`, and attaches `userId` and `role` to the socket. If verification fails, the connection is rejected with `connect_error`.

**Q9: Why is PostgreSQL the source of truth, not Socket.io?**  
Socket.io is a delivery mechanism — messages are not guaranteed to be received if the client is offline. All messages are first written to PostgreSQL, then the socket event is emitted. If the client is offline, they load the message history via REST on next connection.

**Q10: Why Redis for OTPs and not PostgreSQL?**  
PostgreSQL doesn't have native row-level TTL (automatic expiration). We would need a scheduled cleanup job. Redis TTL deletes the key atomically after the specified time — perfect for OTPs with a 5-minute validity window. OTPs also must not persist after use, making Redis the correct choice.

**Q11: How does OTP expiration work?**  
When the OTP is stored in Redis: `redis.set(key, value, { ex: 300 })`. This sets a 300-second TTL. After 300 seconds, Redis automatically deletes the key. Any verification attempt after expiry returns `null` from `redis.get()`, which is treated as "OTP expired."

**Q12: How is OTP brute-force prevented?**  
The OTP data stored in Redis includes an `attempts` counter: `{ otp, attempts }`. On each failed verification, `attempts` is incremented. When `attempts >= 5`, the OTP is deleted and the provider must ask the customer to generate a new one. Combined with the 5-minute TTL, this makes brute-forcing practically impossible on 6-digit OTPs.

**Q13: How are service proofs more trustworthy than self-reported completion?**  
Photos with timestamps are uploaded to Cloudinary and stored in PostgreSQL. Both customer and provider can upload before/after photos. This creates a verifiable evidence trail that can resolve disputes. Neither party can fabricate photos retroactively.

**Q14: Why not store proof images directly in PostgreSQL?**  
PostgreSQL is not optimized for storing large binary data (BLOBs). This would inflate database size, increase backup time, and hurt query performance. Cloudinary provides CDN delivery, image optimization, and proper binary storage. PostgreSQL only stores the metadata (URL, public_id).

**Q15: How are reviews linked to bookings (no fake reviews)?**  
The Review model has `bookingId` as a `@unique` field. This means one review per booking, enforced at the database level. The controller additionally checks that: (1) The booking is COMPLETED, (2) The customer owns the booking, (3) No review exists yet for this booking. Three layers of prevention.

**Q16: How is the provider's average rating calculated?**  
After each new review, the backend runs `prisma.review.aggregate({ _avg: { rating: true }, _count: { rating: true } })` inside a transaction. This computes the true database-level average, not an incremental running average that could drift. The result is stored back on the Provider record.

**Q17: What is the trust score and how is it calculated?**  
The trust score is a deterministic formula (NOT AI) with four components: verification status (30pts), normalized average rating (25pts), completed jobs capped at 100 (25pts), and experience years capped at 10 (20pts). The score and all contributing factors are returned in the API response for full transparency.

**Q18: How does conversation authorization work?**  
Each Conversation record stores `customerId` and `providerId`. Any request to read messages or join the socket room first queries the database: `findFirst({ where: { id, OR: [{ customerId: userId }, { providerId: userId }] } })`. If the user isn't a participant, they get 404 (not 403, to avoid leaking conversation existence).

**Q19: What happens if Redis is unavailable during OTP generation?**  
`getRedis()` throws a structured error with `statusCode: 503`. The Express error handler returns `503 Service Unavailable`. The error is clearly logged. No silent failure occurs. All other endpoints continue working.

**Q20: What happens if a Socket.io client disconnects mid-conversation?**  
Socket.io has automatic reconnection configured (5 attempts, 1s delay). Messages sent while disconnected are stored in PostgreSQL and fetched via REST on reconnection. The conversation history is never lost. Only real-time delivery is interrupted.

**Q21: What data belongs in PostgreSQL vs Redis?**  
PostgreSQL: Users, providers, bookings, conversations, messages, reviews, proofs — anything permanent or relational. Redis: OTPs (must expire), rate limit counters (time-windowed, ephemeral). Never use Redis as a primary database; it's a cache/ephemeral store only.

**Q22: How do you ensure no credentials are leaked?**  
(1) All secrets are in `.env` — never in source code. (2) `.env` is in `.gitignore`. (3) Cloudinary API secret is server-side only. (4) Frontend only receives non-sensitive data (URLs, not credentials). (5) JWT payload contains only `id` and `role`, not password. (6) Password fields are never returned in API responses.
