import { getRedis } from './_redis';

export const config = { runtime: 'edge' };
declare const process: { env: Record<string, string | undefined> };

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODEL = 'google/gemini-2.5-flash-lite';
const BRIEF_KEY = 'brief:daily';
const BRIEF_TTL = 60 * 60 * 8; // 8 hours

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
  }

  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  // Check Redis cache first
  try {
    const redis = getRedis();
    const cached = await redis.get<string>(BRIEF_KEY);
    if (cached && cached !== '__NEG__') {
      return new Response(JSON.stringify({ brief: cached, cached: true }), { headers });
    }
  } catch { /* fall through */ }

  // Fetch today's global positive stories from Redis
  let stories: Array<{ title: string; summary: string }> = [];
  try {
    const redis = getRedis();
    const raw = await redis.get<string>('feed:positive:global');
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      stories = (parsed as Array<{ title: string; summary: string }>).slice(0, 10);
    }
  } catch { /* use empty stories */ }

  if (stories.length === 0) {
    return new Response(JSON.stringify({ brief: null, reason: 'No stories available yet' }), { status: 200, headers });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ brief: null, reason: 'API key not configured' }), { status: 200, headers });
  }

  const storySummary = stories.map((s, i) =>
    `${i + 1}. ${s.title}${s.summary ? ' — ' + s.summary.slice(0, 100) : ''}`
  ).join('\n');

  const prompt = `You are writing a warm, optimistic daily briefing for a positive news dashboard called "Low Cortisol News". 
Summarize these top positive stories from today into ONE paragraph (3-4 sentences max) that feels uplifting and human. 
Do not list items. Flow naturally. End with an encouraging sentence.

Stories:
${storySummary}

Write the daily brief paragraph:`;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const brief = data.choices?.[0]?.message?.content?.trim() ?? null;

    if (brief) {
      const redis = getRedis();
      await redis.set(BRIEF_KEY, brief, { ex: BRIEF_TTL });
    }

    return new Response(JSON.stringify({ brief, cached: false }), { headers });
  } catch {
    const redis = getRedis();
    await redis.set(BRIEF_KEY, '__NEG__', { ex: 300 });
    return new Response(JSON.stringify({ brief: null, reason: 'LLM unavailable' }), { status: 200, headers });
  }
}
