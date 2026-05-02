import { getRedis } from './_redis.ts';
import { passesKeywordFilter } from '../src/classifier/keywords.ts';
import type { Story } from '../src/types.ts';

export const config = { runtime: 'edge' };

const ALLOWED_DOMAINS = [
  'positive.news', 'goodnewsnetwork.org', 'optimistdaily.com',
  'dawn.com', 'thenews.com.pk', 'tribune.com.pk', 'propakistani.pk',
  'pakwired.com', 'who.int', 'nasa.gov', 'mit.edu', 'sciencedaily.com',
  'worldwildlife.org', 'mongabay.com', 'ourworldindata.org',
  'reasonstobecheerful.world', 'yesmagazine.org', 'greatergood.berkeley.edu',
  'newscientist.com', 'news.un.org',
];

function parseRSSEdge(xml: string): Array<Omit<Story, 'sourceName' | 'source' | 'region' | 'category'>> {
  const stories: Array<Omit<Story, 'sourceName' | 'source' | 'region' | 'category'>> = [];
  // Simple regex-based parser for edge runtime (no DOMParser in all edge environments)
  const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
  const tagRegex = (tag: string) => new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const hrefRegex = /<link[^>]+href=["']([^"']+)["']/i;
  const cdataRegex = /^<!\[CDATA\[([\s\S]*?)\]\]>$/;

  const matched = xml.match(itemRegex) ?? [];
  for (const item of matched) {
    const extractTag = (tag: string): string => {
      const m = item.match(tagRegex(tag));
      if (!m) return '';
      const val = m[1].trim();
      const cdata = val.match(cdataRegex);
      return (cdata ? cdata[1] : val)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim();
    };

    const title = extractTag('title');
    if (!title) continue;

    const linkTag = item.match(tagRegex('link'));
    const hrefAttr = item.match(hrefRegex);
    const link = (linkTag ? linkTag[1].trim() : '') || (hrefAttr ? hrefAttr[1] : '');

    const summary = extractTag('description') || extractTag('summary') || extractTag('content');
    const pubDate = extractTag('pubDate') || extractTag('published') || extractTag('updated');

    const mediaUrl = item.match(/<(?:media:content|content)[^>]+url=["']([^"']+)["']/i);
    const thumbUrl = item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
    const encUrl = item.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i);
    const imgMatch = item.match(/<img[^>]+src=["']([^"']+)["']/i);
    const imageTagMatch = item.match(/<image>[^<]*<url>([^<]+)<\/url>/i);

    const imageUrl = mediaUrl?.[1] || thumbUrl?.[1] || encUrl?.[1] || imgMatch?.[1] || imageTagMatch?.[1] || '';

    stories.push({ title, summary: summary.slice(0, 300), link, pubDate, imageUrl });
  }
  return stories;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
  }

  const reqUrl = new URL(req.url);
  const feedUrl = reqUrl.searchParams.get('url');
  const sourceName = reqUrl.searchParams.get('name') ?? 'Unknown';
  const region = (reqUrl.searchParams.get('region') ?? 'global') as Story['region'];
  const category = (reqUrl.searchParams.get('category') ?? 'general') as Story['category'];

  if (!feedUrl) {
    return new Response('Missing url parameter', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  let hostname: string;
  try {
    hostname = new URL(feedUrl).hostname.replace(/^www\./, '');
  } catch {
    return new Response('Invalid url parameter', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (!ALLOWED_DOMAINS.some(d => hostname.endsWith(d))) {
    return new Response('Domain not allowed', { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const cacheKey = `rss:${hostname}`;

  // Check Redis cache first
  try {
    const redis = getRedis();
    const cached = await redis.get<string>(cacheKey);
    if (cached && cached !== '__NEG__') {
      return new Response(cached, {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' }
      });
    }
  } catch { /* Redis unavailable — fall through */ }

  // Fetch and parse the RSS feed
  try {
    const xml = await fetch(feedUrl, {
      headers: { 'User-Agent': 'LowCortisolNews/1.0' },
      signal: AbortSignal.timeout(12000),
    }).then(r => r.text());

    const parsed = parseRSSEdge(xml);
    const positive: Story[] = parsed
      .filter(s => passesKeywordFilter(s.title + ' ' + s.summary))
      .map(s => ({ ...s, sourceName, source: feedUrl, region, category }));

    const result = JSON.stringify(positive);
    try {
      const redis = getRedis();
      await redis.set(cacheKey, result, { ex: 300 }); // 5-min TTL
    } catch { /* ignore Redis write failure */ }

    return new Response(result, {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS', 'Access-Control-Allow-Origin': '*' }
    });
  } catch {
    try {
      const redis = getRedis();
      await redis.set(cacheKey, '__NEG__', { ex: 300 });
    } catch { /* ignore */ }
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'ERROR', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
