import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '.env');

  if (envPath) {
    const envFile = fs.readFileSync(envPath, 'utf8');
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

const POSITIVE_KEYWORDS = new Set([
  'breakthrough', 'milestone', 'discovery', 'cured', 'saved', 'restored',
  'record', 'first time', 'achieved', 'launched', 'improved', 'solution',
  'progress', 'success', 'hope', 'recovery', 'awarded', 'celebrated',
  'innovation', 'invented', 'protected', 'cleaned', 'rewilded', 'rebuilt',
  'peace', 'agreement', 'collaboration', 'grant', 'funded', 'expanded',
  'grew', 'increased access', 'affordable', 'reduced poverty',
  'vaccination', 'eradicated', 'renewable', 'solar', 'habitat', 'species',
  'children', 'education', 'school', 'scholarship', 'literacy', 'empowerment',
]);

const NEGATIVE_BLOCKLIST = new Set([
  'killed', 'dead', 'death', 'murder', 'attack', 'blast', 'explosion',
  'war', 'conflict', 'clash', 'violence', 'riot', 'protest', 'arrest',
  'crash', 'flood', 'earthquake', 'disaster', 'crisis', 'collapse',
  'fraud', 'scam', 'corruption', 'scandal', 'fired', 'bankrupt',
]);

function passesKeywordFilter(text) {
  const lower = text.toLowerCase();
  for (const word of NEGATIVE_BLOCKLIST) {
    if (lower.includes(word)) return false;
  }
  for (const word of POSITIVE_KEYWORDS) {
    if (lower.includes(word)) return true;
  }
  return false;
}

const FEEDS = [
  // ─── GLOBAL POSITIVE (Dedicated) ──────────────────────────────────────────
  { url: 'https://www.positive.news/feed/', name: 'Positive News', region: 'global', category: 'global' },
  { url: 'https://www.goodnewsnetwork.org/feed/', name: 'Good News Network', region: 'global', category: 'global' },
  { url: 'https://reasonstobecheerful.world/feed/', name: 'Reasons to be Cheerful', region: 'global', category: 'global' },
  { url: 'https://www.optimistdaily.com/feed/', name: 'Optimist Daily', region: 'global', category: 'global' },
  { url: 'https://www.goodgoodgood.co/articles/rss.xml', name: 'Good Good Good', region: 'global', category: 'global' },

  // ─── AUTHORITATIVE GLOBAL (Seed-only) ──────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en-US&gl=US&ceid=US:en', name: 'Reuters World', region: 'global', category: 'global' },
  { url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en', name: 'AP News', region: 'global', category: 'global' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', region: 'global', category: 'global' },
  { url: 'https://www.theguardian.com/world/rss', name: 'Guardian World', region: 'global', category: 'global' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', region: 'global', category: 'global' },
  { url: 'https://www.euronews.com/rss?format=xml', name: 'EuroNews', region: 'global', category: 'global' },
  { url: 'https://www.france24.com/en/rss', name: 'France 24', region: 'global', category: 'global' },
  { url: 'https://www.dw.com/en/rss-en-all/s-9099', name: 'DW News', region: 'global', category: 'global' },

  // ─── SCIENCE & DISCOVERY ──────────────────────────────────────────────────
  { url: 'https://news.mit.edu/rss/research', name: 'MIT Research', region: 'global', category: 'science' },
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', name: 'NASA News', region: 'global', category: 'science' },
  { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'Science Daily', region: 'global', category: 'science' },
  { url: 'https://feeds.nature.com/nature/rss/current', name: 'Nature News', region: 'global', category: 'science' },
  { url: 'https://www.livescience.com/feeds.xml', name: 'Live Science', region: 'global', category: 'science' },
  { url: 'https://www.newscientist.com/feed/home/', name: 'New Scientist', region: 'global', category: 'science' },
  { url: 'https://singularityhub.com/feed/', name: 'Singularity Hub', region: 'global', category: 'science' },
  { url: 'https://humanprogress.org/feed/', name: 'Human Progress', region: 'global', category: 'science' },

  // ─── ENVIRONMENT & EARTH ──────────────────────────────────────────────────
  { url: 'https://www.worldwildlife.org/stories.rss', name: 'WWF Stories', region: 'global', category: 'environment' },
  { url: 'https://www.mongabay.com/feed/', name: 'Mongabay', region: 'global', category: 'environment' },
  { url: 'https://conservationoptimism.org/feed/', name: 'Conservation Optimism', region: 'global', category: 'environment' },
  { url: 'https://ourworldindata.org/atom.xml', name: 'Our World in Data', region: 'global', category: 'science' },

  // ─── COMMUNITY & IMPACT ───────────────────────────────────────────────────
  { url: 'https://www.yesmagazine.org/feed', name: 'Yes! Magazine', region: 'global', category: 'community' },
  { url: 'https://greatergood.berkeley.edu/site/rss/articles', name: 'Greater Good', region: 'global', category: 'community' },
  { url: 'https://www.shareable.net/feed/', name: 'Shareable', region: 'global', category: 'community' },

  // ─── PAKISTAN ─────────────────────────────────────────────────────────────
  { url: 'https://www.dawn.com/feeds/home', name: 'Dawn', region: 'pakistan', category: 'global' },
  { url: 'https://www.thenews.com.pk/rss/1/7', name: 'The News', region: 'pakistan', category: 'global' },
  { url: 'https://tribune.com.pk/feed/home', name: 'Express Tribune', region: 'pakistan', category: 'global' },
  { url: 'https://propakistani.pk/feed/', name: 'ProPakistani', region: 'pakistan', category: 'innovation' },
  { url: 'https://pakwired.com/feed/', name: 'PakWired', region: 'pakistan', category: 'innovation' },
];

async function fetchFeed(feedMeta) {
  try {
    const res = await fetch(feedMeta.url, {
      headers: { 'User-Agent': 'LowCortisolNews/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const xml = await res.text();

    const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
    const tagRegex = (tag) => new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const hrefRegex = /<link[^>]+href=["']([^"']+)["']/i;
    const cdataRegex = /^<!\[CDATA\[([\s\S]*?)\]\]>$/;

    const matched = xml.match(itemRegex) || [];
    const stories = [];

    for (const itemXml of matched) {
      const extractTag = (tag) => {
        const m = itemXml.match(tagRegex(tag));
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

      const linkTag = itemXml.match(tagRegex('link'));
      const hrefAttr = itemXml.match(hrefRegex);
      const link = (linkTag ? linkTag[1].trim() : '') || (hrefAttr ? hrefAttr[1] : '');

      const summaryRaw = extractTag('description') || extractTag('summary') || extractTag('content');
      const summary = summaryRaw.slice(0, 300);

      const pubDate = extractTag('pubDate') || extractTag('published') || extractTag('updated');

      const mediaMatch = itemXml.match(/<(?:media:content|content)[^>]+url=["']([^"']+)["']/i);
      const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
      const encMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i);
      const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
      const imageTagMatch = itemXml.match(/<image>[^<]*<url>([^<]+)<\/url>/i);
      const imageUrl = mediaMatch?.[1] || thumbMatch?.[1] || encMatch?.[1] || imgMatch?.[1] || imageTagMatch?.[1] || '';

      const text = (title + ' ' + summary).toLowerCase();
      if (passesKeywordFilter(text)) {
        stories.push({
          title, summary, link, pubDate,
          imageUrl,
          source: feedMeta.url,
          sourceName: feedMeta.name,
          region: feedMeta.region,
          category: feedMeta.category,
        });
      }
    }
    return stories;
  } catch (e) {
    console.error(`Failed: ${feedMeta.url} — ${e.message}`);
    return [];
  }
}

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
}

async function run() {
  console.log('Low Cortisol News: seeding started');
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const allStories = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allStories.push(...r.value);
  }

  // Sort by date descending
  allStories.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // Deduplicate by headline prefix
  const seen = new Set();
  const deduped = allStories.filter(s => {
    const key = djb2(s.title.toLowerCase().slice(0, 60)).toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const global = deduped.filter(s => s.region === 'global').slice(0, 50);
  const pakistan = deduped.filter(s => s.region === 'pakistan').slice(0, 30);
  const science = deduped.filter(s => s.category === 'science').slice(0, 20);
  const environment = deduped.filter(s => s.category === 'environment').slice(0, 20);
  const community = deduped.filter(s => s.category === 'community').slice(0, 20);
  const innovation = deduped.filter(s => s.category === 'innovation').slice(0, 20);

  await Promise.all([
    redis.set('feed:positive:global', JSON.stringify(global), { ex: 600 }),
    redis.set('feed:positive:pakistan', JSON.stringify(pakistan), { ex: 600 }),
    redis.set('feed:science', JSON.stringify(science), { ex: 600 }),
    redis.set('feed:environment', JSON.stringify(environment), { ex: 600 }),
    redis.set('feed:community', JSON.stringify(community), { ex: 600 }),
    redis.set('feed:innovation', JSON.stringify(innovation), { ex: 600 }),
    redis.set('seed:last_run', new Date().toISOString(), { ex: 3600 }),
  ]);

  console.log(`Seeded: ${global.length} global, ${pakistan.length} pakistan, ${science.length} science, ${environment.length} environment, ${community.length} community, ${innovation.length} innovation`);
}

run().catch(e => {
  console.error('Seed failed:', e);
  process.exit(1);
});
