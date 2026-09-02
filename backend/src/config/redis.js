/**
 * Upstash Redis Client (Phase 3)
 *
 * Uses REST-based @upstash/redis client with seamless in-memory fallback
 * if Upstash returns auth error (e.g. redis-cli password provided instead of REST token)
 * or network failure.
 */

import { Redis } from '@upstash/redis';
import { env } from './env.js';

class InMemoryRedis {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  _isExpired(key) {
    const exp = this.ttls.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.ttls.delete(key);
      return true;
    }
    return false;
  }

  async set(key, val, opts) {
    this.store.set(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
    if (opts?.ex) {
      this.ttls.set(key, Date.now() + opts.ex * 1000);
    }
    return 'OK';
  }

  async get(key) {
    if (this._isExpired(key)) return null;
    const val = this.store.get(key);
    if (val === undefined) return null;
    return val;
  }

  async del(key) {
    this.ttls.delete(key);
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key) {
    if (this._isExpired(key)) this.store.delete(key);
    const curr = parseInt(this.store.get(key) || '0', 10);
    const next = curr + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key, seconds) {
    if (!this.store.has(key)) return 0;
    this.ttls.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key) {
    const exp = this.ttls.get(key);
    if (!exp) return -1;
    const rem = Math.round((exp - Date.now()) / 1000);
    return rem > 0 ? rem : -2;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const res = [];
    for (const k of this.store.keys()) {
      if (!this._isExpired(k) && regex.test(k)) res.push(k);
    }
    return res;
  }
}

const memoryRedis = new InMemoryRedis();
let upstashClient = null;
let useMemoryOnly = false;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    upstashClient = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('✅ Upstash Redis client initialised');
  } catch (err) {
    console.warn('⚠️ Upstash client init failed, using in-memory store:', err.message);
    useMemoryOnly = true;
  }
} else {
  useMemoryOnly = true;
}

// Resilient wrapper: executes on Upstash, falls back to in-memory on auth failure or unreachable
const createResilientRedis = () => {
  const handler = {
    get(target, prop) {
      if (typeof memoryRedis[prop] === 'function') {
        return async (...args) => {
          if (useMemoryOnly || !upstashClient) {
            return memoryRedis[prop](...args);
          }
          try {
            return await upstashClient[prop](...args);
          } catch (err) {
            if (err.name === 'UpstashError' || err.message?.includes('WRONGPASS') || err.message?.includes('auth')) {
              useMemoryOnly = true;
              return memoryRedis[prop](...args);
            }
            throw err;
          }
        };
      }
      return target[prop];
    },
  };
  return new Proxy({}, handler);
};

const resilientRedis = createResilientRedis();

export const getRedis = () => {
  return resilientRedis;
};

export default resilientRedis;
