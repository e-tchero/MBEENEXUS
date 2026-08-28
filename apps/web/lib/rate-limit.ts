/**
 * In-memory sliding-window rate limiter for Embee Nexus.
 *
 * No Redis dependency. Designed for serverless environments.
 * Counters reset on cold start — acceptable as defense-in-depth.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

// In-memory store with automatic cleanup
const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000; // Clean up every 60 seconds

/**
 * Pre-defined rate limit tiers.
 */
export const RATE_LIMITS = {
  /** Authentication endpoints (login, signup) */
  auth: { limit: 10, windowMs: 60_000 },
  /** Quote generation */
  quote: { limit: 20, windowMs: 60_000 },
  /** Order creation */
  order: { limit: 10, windowMs: 60_000 },
  /** Payment initialization */
  payment: { limit: 5, windowMs: 60_000 },
  /** GPS location updates from riders */
  gps: { limit: 20, windowMs: 60_000 },
  /** Default for all other endpoints */
  default: { limit: 60, windowMs: 60_000 },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  const cutoff = now - 120_000; // Remove entries older than 2 minutes

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Check rate limit for a given key.
 *
 * @param key - Unique identifier (user ID or IP address)
 * @param tier - Rate limit tier
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  tier: RateLimitTier = 'default'
): RateLimitResult {
  cleanup();

  const config = RATE_LIMITS[tier];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const currentCount = entry.timestamps.length;

  if (currentCount >= config.limit) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 1000),
    };
  }

  // Allow the request — record timestamp
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: config.limit - currentCount - 1,
    retryAfterMs: 0,
  };
}

/**
 * Get rate limit identity from request.
 *
 * For authenticated users: returns user ID.
 * For unauthenticated: returns IP from x-forwarded-for header.
 */
export function getRateLimitIdentity(
  userId?: string,
  forwardedFor?: string | null,
  ip?: string | null
): string {
  if (userId) return `user:${userId}`;

  // Prefer x-forwarded-for (Vercel/CDN standard)
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return `ip:${firstIp}`;
  }

  if (ip) return `ip:${ip}`;

  return 'ip:unknown';
}

/**
 * Reset rate limit store (for testing).
 */
export function resetRateLimitStore(): void {
  store.clear();
  lastCleanup = Date.now();
}

export type { RateLimitConfig, RateLimitResult };
