import { getRedis } from './_redis';

const FAST_KEYS = [
  'feed:positive:global',
  'feed:positive:pakistan',
  'feed:science',
  'brief:daily',
];

const SLOW_KEYS = [
  'feed:environment',
  'feed:innovation',
  'feed:community',
];

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  const tier = new URL(req.url).searchParams.get('tier') ?? 'fast';
  const keys = tier === 'fast' ? FAST_KEYS : SLOW_KEYS;

  try {
    const redis = getRedis();
    const results = await redis.mget<(string | null)[]>(...keys);

    const payload: Record<string, unknown> = {};
    keys.forEach((key, i) => {
      const val = results[i];
      if (val && val !== '__NEG__') {
        try {
          payload[key] = typeof val === 'string' ? JSON.parse(val) : val;
        } catch {
          payload[key] = val; // Use plain string if not JSON
        }
      }
    });

    return new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Bootstrap error:', err);
    return new Response(JSON.stringify({}), {
      status: 200, // Return empty object, not 500, so panels can self-fetch
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
