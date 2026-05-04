import type { ClassificationResult } from '../types.ts';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODEL = 'google/gemini-2.5-flash-lite';

/**
 * Async LLM-based positivity classifier via OpenRouter free model.
 * Deduplication is handled server-side (seed script checks Redis by headline hash).
 * On the client side, this function is NOT called directly — classification
 * happens in the seed script. This file is used by api/feed.ts as a fallback.
 */
export async function classifyWithLLM(
  headline: string,
  summary: string,
  apiKey: string
): Promise<ClassificationResult | null> {
  const prompt = `You are a positivity classifier for a news dashboard. Analyze this news story and respond ONLY with a JSON object, no other text.

Headline: "${headline}"
Summary: "${summary.slice(0, 300)}"

Respond with this exact JSON structure:
{
  "score": <0-100, where 100 is maximally positive/uplifting>,
  "category": "<one of: science, community, environment, health, innovation, general>",
  "isPakistan": <true if story is about or significantly involves Pakistan, else false>,
  "pass": <true if score >= 60>
}`;

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
        max_tokens: 120,
        temperature: 0.1,
      }),
    });
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    // Find the JSON object within the response
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as ClassificationResult;
  } catch {
    return null;
  }
}
