import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

// In-memory L1 cache (per edge function instance)
const memCache = new Map<string, { data: unknown; expires: number }>();

export async function getCached(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<unknown>
): Promise<unknown> {
  // Tier 1: in-memory
  const mem = memCache.get(key);
  if (mem && Date.now() < mem.expires) return mem.data;

  // Tier 2: Redis
  try {
    const redis = getRedis();
    const cached = await redis.get(key);
    if (cached !== null && cached !== '__NEG__') {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      memCache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
      return data;
    }
    if (cached === '__NEG__') return null; // negative cache sentinel
  } catch { /* Redis down — fall through to upstream */ }

  // Tier 3: upstream
  try {
    const data = await fetchFn();
    const redis = getRedis();
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    memCache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
    return data;
  } catch {
    // Upstream failed — write negative sentinel so concurrent requests don't hammer it
    try {
      const redis = getRedis();
      await redis.set(key, '__NEG__', { ex: 300 }); // 5-min backoff
    } catch { /* ignore */ }
    return null;
  }
}
