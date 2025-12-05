import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Helper functions for common Redis operations

/**
 * Cache data with expiration
 */
export async function cacheSet(
  key: string,
  value: unknown,
  expirationSeconds: number = 3600
): Promise<void> {
  await redis.set(key, JSON.stringify(value), { ex: expirationSeconds });
}

/**
 * Get cached data
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : (data as T);
}

/**
 * Delete cached data
 */
export async function cacheDelete(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Rate limiting helper
 */
export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count current requests
  const count = await redis.zcard(key);

  if (count >= limit) {
    const oldestEntry = await redis.zrange(key, 0, 0, { withScores: true }) as Array<{ score: number; member: string }>;
    const reset = oldestEntry.length > 0 
      ? Math.ceil((Number(oldestEntry[0].score) + windowSeconds * 1000 - now) / 1000)
      : windowSeconds;
    
    return { success: false, remaining: 0, reset };
  }

  // Add new request
  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  await redis.expire(key, windowSeconds);

  return { success: true, remaining: limit - count - 1, reset: windowSeconds };
}

/**
 * Simple pub/sub for real-time features
 */
export async function publishMessage(channel: string, message: unknown): Promise<void> {
  await redis.publish(channel, JSON.stringify(message));
}
