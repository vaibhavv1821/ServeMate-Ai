/**
 * Upstash Redis Client (Phase 3)
 *
 * Uses REST-based @upstash/redis client.
 * This works without a TCP connection — ideal for serverless and edge.
 *
 * Key schema:
 *   otp:{bookingId}       → JSON { otp, attempts }   TTL 300s
 *   otp_gen:{userId}      → count                    TTL 60s
 *   online:{userId}       → "1"                      TTL 30s
 */

import { Redis } from '@upstash/redis';
import { env } from './env.js';

let redis;

try {
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('✅ Upstash Redis client initialised');
} catch (err) {
  console.error('❌ Failed to initialise Upstash Redis client:', err.message);
  redis = null;
}

/**
 * Safe wrapper — if Redis is unavailable, throws a structured error
 * instead of silently failing.
 */
export const getRedis = () => {
  if (!redis) {
    const err = new Error('Redis unavailable — cannot complete this operation');
    err.statusCode = 503;
    throw err;
  }
  return redis;
};

export default redis;
