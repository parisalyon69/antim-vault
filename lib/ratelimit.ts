import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limiters are null when Upstash env vars are not set.
// All call sites must check for null before using — absence means rate limiting
// is disabled (graceful degradation for local dev and pre-Upstash deploys).

function createLimiter(requests: number, window: string): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return new Ratelimit({
    redis,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    limiter: Ratelimit.slidingWindow(requests, window as any),
    prefix: '@antim/rl',
  })
}

// POST /api/release — 3 submissions per IP per hour
export const releaseIpLimiter = createLimiter(3, '1 h')

// POST /api/release — 1 submission per deceased email per 24 h (cross-IP protection)
export const releaseEmailLimiter = createLimiter(1, '24 h')

// GET /release/view — 10 token validation attempts per IP per hour
export const tokenIpLimiter = createLimiter(10, '1 h')
