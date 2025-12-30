/**
 * Rate limiting utilities
 * Simple memory-based rate limiter for development
 * For production, consider Redis-based solution
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Check if a request should be rate limited
   * @param key - Unique identifier (e.g., IP address or user ID)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and retry information
   */
  check(
    key: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (!entry || now > entry.resetAt) {
      // First request or window expired
      const resetAt = now + windowMs;
      this.cache.set(key, { count: 1, resetAt });
      return {
        success: true,
        remaining: limit - 1,
        resetAt,
      };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment counter
    entry.count += 1;
    this.cache.set(key, entry);

    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit presets
 */
export const RATE_LIMITS = {
  // Geocoding API: 30 requests per minute per IP
  GEOCODE: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  // Auth: 5 login attempts per minute per IP
  SIGNIN: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // Auth: 3 signup attempts per minute per IP
  SIGNUP: {
    limit: 3,
    windowMs: 60 * 1000, // 1 minute
  },
  // Spot creation: 10 requests per minute per user
  SPOT_CREATE: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Flag creation: 5 requests per minute per IP (prevent spam)
  FLAG_CREATE: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // General API: 100 requests per minute per IP
  GENERAL: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Spot list: 100 requests per minute per IP
  SPOT_LIST: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Interaction APIs: 30 requests per minute per IP
  INTERACTION: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Extract client IP from request
 * Handles various proxy headers
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a default (not ideal but prevents errors)
  return "unknown";
}

/**
 * Apply rate limiting to a request
 * @param key - Unique identifier for rate limiting
 * @param config - Rate limit configuration
 * @returns Response object if rate limited, null otherwise
 */
export function rateLimit(
  key: string,
  config: { limit: number; windowMs: number }
): { success: boolean; response?: Response } {
  const { success, remaining, resetAt } = rateLimiter.check(
    key,
    config.limit,
    config.windowMs
  );

  if (!success) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "リクエスト数が制限を超えました。しばらく待ってから再試行してください。",
            retry_after_seconds: retryAfter,
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": config.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(resetAt / 1000).toString(),
          },
        }
      ),
    };
  }

  return { success: true };
}

/**
 * Get rate limit headers for successful requests
 */
export function getRateLimitHeaders(
  key: string,
  config: { limit: number; windowMs: number }
): Record<string, string> {
  const entry = rateLimiter["cache"].get(key);

  if (!entry) {
    return {
      "X-RateLimit-Limit": config.limit.toString(),
      "X-RateLimit-Remaining": config.limit.toString(),
    };
  }

  return {
    "X-RateLimit-Limit": config.limit.toString(),
    "X-RateLimit-Remaining": Math.max(0, config.limit - entry.count).toString(),
    "X-RateLimit-Reset": Math.ceil(entry.resetAt / 1000).toString(),
  };
}

export default rateLimiter;
