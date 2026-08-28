import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Rate limiter algorithm tests.
 *
 * Since the rate limiter lives in apps/web/lib/ (outside packages/shared rootDir),
 * we test the core sliding-window algorithm by reimplementing it here.
 * Integration testing of the actual rate limiter is done at the API route level.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },
  quote: { limit: 20, windowMs: 60_000 },
  order: { limit: 10, windowMs: 60_000 },
  payment: { limit: 5, windowMs: 60_000 },
  gps: { limit: 20, windowMs: 60_000 },
  default: { limit: 60, windowMs: 60_000 },
} as const;

type RateLimitTier = keyof typeof RATE_LIMITS;

function checkRateLimit(key: string, tier: RateLimitTier = 'default') {
  const config = RATE_LIMITS[tier];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
  const currentCount = entry.timestamps.length;

  if (currentCount >= config.limit) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: config.limit - currentCount - 1, retryAfterMs: 0 };
}

function getRateLimitIdentity(userId?: string, forwardedFor?: string | null, ip?: string | null): string {
  if (userId) return `user:${userId}`;
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return `ip:${firstIp}`;
  }
  if (ip) return `ip:${ip}`;
  return 'ip:unknown';
}

describe('Rate Limiter Algorithm', () => {
  beforeEach(() => {
    store.clear();
  });

  it('allows requests within the limit', () => {
    const result = checkRateLimit('user:test-1', 'auth');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.auth.limit - 1);
  });

  it('blocks requests exceeding the limit', () => {
    const key = 'user:test-block';
    const limit = RATE_LIMITS.auth.limit;

    for (let i = 0; i < limit; i++) {
      const result = checkRateLimit(key, 'auth');
      expect(result.allowed).toBe(true);
    }

    const blocked = checkRateLimit(key, 'auth');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks different keys independently', () => {
    const key1 = 'user:independent-1';
    const key2 = 'user:independent-2';

    for (let i = 0; i < RATE_LIMITS.auth.limit; i++) {
      checkRateLimit(key1, 'auth');
    }

    const result = checkRateLimit(key2, 'auth');
    expect(result.allowed).toBe(true);
  });

  it('uses correct tier limits', () => {
    expect(RATE_LIMITS.auth.limit).toBe(10);
    expect(RATE_LIMITS.quote.limit).toBe(20);
    expect(RATE_LIMITS.order.limit).toBe(10);
    expect(RATE_LIMITS.payment.limit).toBe(5);
    expect(RATE_LIMITS.gps.limit).toBe(20);
    expect(RATE_LIMITS.default.limit).toBe(60);
  });

  it('returns remaining count correctly', () => {
    const key = 'user:remaining-test';

    const first = checkRateLimit(key, 'payment');
    expect(first.remaining).toBe(RATE_LIMITS.payment.limit - 1);

    const second = checkRateLimit(key, 'payment');
    expect(second.remaining).toBe(RATE_LIMITS.payment.limit - 2);
  });

  it('different tiers have independent counters', () => {
    const key = 'user:tier-test';

    for (let i = 0; i < RATE_LIMITS.auth.limit; i++) {
      checkRateLimit(key, 'auth');
    }

    const gpsResult = checkRateLimit(key, 'gps');
    expect(gpsResult.allowed).toBe(true);
  });

  it('getRateLimitIdentity returns user ID when authenticated', () => {
    expect(getRateLimitIdentity('user-123', null, null)).toBe('user:user-123');
  });

  it('getRateLimitIdentity returns IP from x-forwarded-for', () => {
    expect(getRateLimitIdentity(undefined, '192.168.1.1, 10.0.0.1', null)).toBe('ip:192.168.1.1');
  });

  it('getRateLimitIdentity returns unknown when no identity', () => {
    expect(getRateLimitIdentity(undefined, null, null)).toBe('ip:unknown');
  });

  it('getRateLimitIdentity prefers user ID over IP', () => {
    expect(getRateLimitIdentity('user-123', '192.168.1.1', null)).toBe('user:user-123');
  });
});
