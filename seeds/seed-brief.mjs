import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '../.env'); // if run from seeds folder
  const envPath2 = path.resolve(process.cwd(), '.env'); // if run from code folder
  const actualPath = fs.existsSync(envPath) ? envPath : (fs.existsSync(envPath2) ? envPath2 : null);

  if (actualPath) {
    const envFile = fs.readFileSync(actualPath, 'utf8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[match[1]]) process.env[match[1]] = val.trim();
      }
    }
  }
} catch (e) {
  // Silent fallback
}


const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODEL = 'google/gemini-2.5-flash-lite';
const BRIEF_KEY = 'brief:daily';
const BRIEF_TTL = 60 * 60 * 8; // 8 hours — only regenerate 3 times per day

async function run() {
  // Check if brief was generated recently
  const lastBrief = await redis.get(BRIEF_KEY);
  if (lastBrief && lastBrief !== '__NEG__') {
    console.log('Brief already fresh — skipping LLM call');
    return;
  }

  const raw = await redis.get('feed:positive:global');
  if (!raw) {
    console.error('No global stories in Redis yet — run seed-positive-news.mjs first');
    process.exit(1);
  }

  const stories = (typeof raw === 'string' ? JSON.parse(raw) : raw).slice(0, 10);

  const storySummary = stories.map((s, i) =>
    `${i + 1}. ${s.title}${s.summary ? ' — ' + s.summary.slice(0, 100) : ''}`
  ).join('\n');

  const prompt = `You are writing a warm, optimistic daily briefing for a positive news dashboard called "Low Cortisol News". 
Summarize these top positive stories from today into ONE paragraph (3-4 sentences max) that feels uplifting and human. 
Do not list items. Flow naturally. End with an encouraging sentence.

Stories:
${storySummary}

Write the daily brief paragraph:`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not set');
    process.exit(1);
  }

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
    const data = await res.json();
    const brief = data.choices?.[0]?.message?.content?.trim();
    if (brief) {
      await redis.set(BRIEF_KEY, brief, { ex: BRIEF_TTL });
      console.log('✅ Daily brief seeded:', brief.slice(0, 80) + '…');
    } else {
      console.error('LLM returned empty response');
      await redis.set(BRIEF_KEY, '__NEG__', { ex: 300 });
    }
  } catch (e) {
    console.error('LLM call failed:', e.message);
    await redis.set(BRIEF_KEY, '__NEG__', { ex: 300 });
    process.exit(1);
  }
}

run().catch(e => {
  console.error('seed-brief failed:', e);
  process.exit(1);
});
