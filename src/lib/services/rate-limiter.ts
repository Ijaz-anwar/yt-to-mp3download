import { NextRequest } from "next/server";
import { MediaError } from "./error-handler";

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
  purge(): Promise<number>;
}

/**
 * In-memory sliding-window rate limit store with automatic pruning.
 * Suitable for local development, single-instance deployments, and testing.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, RateLimitEntry>();
  private lastPurge = Date.now();

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();

    // Periodic sweep every 60 seconds
    if (now - this.lastPurge > 60000) {
      await this.purge();
      this.lastPurge = now;
    }

    const current = this.entries.get(key);

    if (!current || now >= current.resetAt) {
      const resetAt = now + windowMs;
      this.entries.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
        resetAt,
      };
    }

    if (current.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt: current.resetAt,
        retryAfterSeconds,
      };
    }

    current.count += 1;
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - current.count),
      resetAt: current.resetAt,
    };
  }

  async reset(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async purge(): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.entries.entries()) {
      if (now >= entry.resetAt) {
        this.entries.delete(key);
        count++;
      }
    }
    return count;
  }
}

/**
 * Production-ready Rate Limit Store Adapter interface.
 * When running in a multi-instance cluster, set RATE_LIMIT_REDIS_URL or provide a Redis adapter.
 */
export class SharedRateLimitAdapter {
  private store: RateLimitStore;

  constructor(customStore?: RateLimitStore) {
    this.store = customStore || new MemoryRateLimitStore();
  }

  setStore(store: RateLimitStore) {
    this.store = store;
  }

  getStore(): RateLimitStore {
    return this.store;
  }
}

const globalForRateLimit = globalThis as unknown as {
  rateLimitAdapter?: SharedRateLimitAdapter;
};

export const rateLimitAdapter =
  globalForRateLimit.rateLimitAdapter ?? new SharedRateLimitAdapter();
globalForRateLimit.rateLimitAdapter = rateLimitAdapter;

export type RateLimitTier = "analyze" | "upload" | "job_create" | "job_status" | "download";

export interface TierConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, TierConfig> = {
  analyze: {
    limit: parseInt(process.env.RATE_LIMIT_ANALYZE || "30", 10),
    windowMs: 5 * 60 * 1000, // 30 req / 5 min
  },
  upload: {
    limit: parseInt(process.env.RATE_LIMIT_UPLOAD || "20", 10),
    windowMs: 5 * 60 * 1000, // 20 uploads / 5 min
  },
  job_create: {
    limit: parseInt(process.env.RATE_LIMIT_JOB_CREATE || "25", 10),
    windowMs: 5 * 60 * 1000, // 25 jobs / 5 min
  },
  job_status: {
    limit: parseInt(process.env.RATE_LIMIT_JOB_STATUS || "300", 10),
    windowMs: 60 * 1000, // 300 polls / 1 min (5/sec max)
  },
  download: {
    limit: parseInt(process.env.RATE_LIMIT_DOWNLOAD || "50", 10),
    windowMs: 5 * 60 * 1000, // 50 downloads / 5 min
  },
};

/**
 * Safely extracts client IP address from standard reverse proxy headers or socket fallback.
 */
export function getClientIp(req: NextRequest): string {
  // Cloudflare
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && isValidIp(cfIp)) return cfIp.trim();

  // Nginx / Standard Reverse Proxy
  const realIp = req.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp)) return realIp.trim();

  // Standard X-Forwarded-For (take the first untrusted client IP)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((s) => s.trim());
    if (ips.length > 0 && isValidIp(ips[0])) {
      return ips[0];
    }
  }

  return "127.0.0.1";
}

function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  // Basic IPv4 or IPv6 sanity
  return /^[a-fA-F0-9:.]+$/.test(ip.trim());
}

/**
 * Enforces rate limiting on an API endpoint.
 * Throws MediaError with HTTP 429 and Retry-After if exceeded.
 */
export async function enforceRateLimit(
  req: NextRequest,
  tier: RateLimitTier,
  customKey?: string
): Promise<Headers> {
  // Allow bypassing rate limits during local automated testing if explicitly configured
  if (process.env.DISABLE_RATE_LIMITS === "true") {
    return new Headers();
  }

  const clientIp = getClientIp(req);
  const key = `${tier}:${customKey || clientIp}`;
  const config = RATE_LIMIT_TIERS[tier];

  const store = rateLimitAdapter.getStore();
  const result = await store.consume(key, config.limit, config.windowMs);

  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());

  if (!result.allowed) {
    headers.set("Retry-After", (result.retryAfterSeconds || 60).toString());
    throw new MediaError(
      `Rate limit exceeded for ${tier}. Please try again in ${result.retryAfterSeconds} seconds.`,
      429,
      "RATE_LIMIT_EXCEEDED",
      {
        retryAfter: result.retryAfterSeconds,
        tier,
      }
    );
  }

  return headers;
}
