import type { FeedSource } from '../../lib/types';

export const ALL_SOURCES: FeedSource[] = [
  // ─── GLOBAL POSITIVE (Dedicated) ──────────────────────────────────────────
  { url: 'https://www.positive.news/feed/', name: 'Positive News', category: 'global', region: 'global', tier: 1, isLive: true },
  { url: 'https://www.goodnewsnetwork.org/feed/', name: 'Good News Network', category: 'global', region: 'global', tier: 1, isLive: true },
  { url: 'https://reasonstobecheerful.world/feed/', name: 'Reasons to be Cheerful', category: 'global', region: 'global', tier: 2, isLive: true },
  { url: 'https://www.optimistdaily.com/feed/', name: 'Optimist Daily', category: 'global', region: 'global', tier: 2, isLive: true },
  { url: 'https://www.goodgoodgood.co/articles/rss.xml', name: 'Good Good Good', category: 'global', region: 'global', tier: 2, isLive: true },

  // ─── AUTHORITATIVE GLOBAL (Seed-only, high volume) ─────────────────────────
  { url: 'https://news.google.com/rss/search?q=site:reuters.com+world&hl=en-US&gl=US&ceid=US:en', name: 'Reuters World', category: 'global', region: 'global', tier: 1, isLive: false },
  { url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en', name: 'AP News', category: 'global', region: 'global', tier: 1, isLive: false },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', category: 'global', region: 'global', tier: 1, isLive: false },
  { url: 'https://www.theguardian.com/world/rss', name: 'Guardian World', category: 'global', region: 'global', tier: 2, isLive: false },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', category: 'global', region: 'global', tier: 2, isLive: false },
  { url: 'https://www.euronews.com/rss?format=xml', name: 'EuroNews', category: 'global', region: 'global', tier: 2, isLive: false },
  { url: 'https://www.france24.com/en/rss', name: 'France 24', category: 'global', region: 'global', tier: 2, isLive: false },
  { url: 'https://www.dw.com/en/rss-en-all/s-9099', name: 'DW News', category: 'global', region: 'global', tier: 2, isLive: false },

  // ─── SCIENCE & DISCOVERY ──────────────────────────────────────────────────
  { url: 'https://news.mit.edu/rss/research', name: 'MIT Research', category: 'science', region: 'global', tier: 1, isLive: true },
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', name: 'NASA News', category: 'science', region: 'global', tier: 1, isLive: true },
  { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'Science Daily', category: 'science', region: 'global', tier: 2, isLive: false },
  { url: 'https://feeds.nature.com/nature/rss/current', name: 'Nature News', category: 'science', region: 'global', tier: 1, isLive: false },
  { url: 'https://www.livescience.com/feeds.xml', name: 'Live Science', category: 'science', region: 'global', tier: 2, isLive: false },
  { url: 'https://www.newscientist.com/feed/home/', name: 'New Scientist', category: 'science', region: 'global', tier: 2, isLive: false },
  { url: 'https://singularityhub.com/feed/', name: 'Singularity Hub', category: 'science', region: 'global', tier: 2, isLive: true },
  { url: 'https://humanprogress.org/feed/', name: 'Human Progress', category: 'science', region: 'global', tier: 2, isLive: true },

  // ─── ENVIRONMENT & EARTH ──────────────────────────────────────────────────
  { url: 'https://www.worldwildlife.org/stories.rss', name: 'WWF Stories', category: 'environment', region: 'global', tier: 1, isLive: true },
  { url: 'https://www.mongabay.com/feed/', name: 'Mongabay', category: 'environment', region: 'global', tier: 2, isLive: false },
  { url: 'https://conservationoptimism.org/feed/', name: 'Conservation Optimism', category: 'environment', region: 'global', tier: 2, isLive: true },
  { url: 'https://ourworldindata.org/atom.xml', name: 'Our World in Data', category: 'science', region: 'global', tier: 1, isLive: true },

  // ─── INNOVATION & TECH ───────────────────────────────────────────────────
  { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', category: 'innovation', region: 'global', tier: 2, isLive: false },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'innovation', region: 'global', tier: 2, isLive: false },
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', name: 'Ars Technica', category: 'innovation', region: 'global', tier: 2, isLive: false },
  { url: 'https://hnrss.org/frontpage', name: 'Hacker News', category: 'innovation', region: 'global', tier: 2, isLive: false },

  // ─── COMMUNITY & IMPACT ───────────────────────────────────────────────────
  { url: 'https://www.yesmagazine.org/feed', name: 'Yes! Magazine', category: 'community', region: 'global', tier: 2, isLive: true },
  { url: 'https://greatergood.berkeley.edu/site/rss/articles', name: 'Greater Good', category: 'community', region: 'global', tier: 2, isLive: true },
  { url: 'https://www.shareable.net/feed/', name: 'Shareable', category: 'community', region: 'global', tier: 2, isLive: true },

  // ─── PAKISTAN ─────────────────────────────────────────────────────────────
  { url: 'https://www.dawn.com/feeds/home', name: 'Dawn', category: 'global', region: 'pakistan', tier: 1, isLive: false },
  { url: 'https://www.thenews.com.pk/rss/1/7', name: 'The News', category: 'global', region: 'pakistan', tier: 1, isLive: false },
  { url: 'https://tribune.com.pk/feed/home', name: 'Express Tribune', category: 'global', region: 'pakistan', tier: 1, isLive: false },
  { url: 'https://propakistani.pk/feed/', name: 'ProPakistani', category: 'innovation', region: 'pakistan', tier: 2, isLive: true },
  { url: 'https://pakwired.com/feed/', name: 'PakWired', category: 'innovation', region: 'pakistan', tier: 2, isLive: true },
];

/** All sources used for the periodic seed script */
export const SEED_SOURCES = ALL_SOURCES;

/** Specific high-quality sources permitted for live polling in the UI */
export const LIVE_SOURCES = ALL_SOURCES.filter(s => s.isLive);

/** Returns all feed sources for a given region */
export function getFeedsByRegion(region: 'global' | 'pakistan', liveOnly = false): FeedSource[] {
  const sources = liveOnly ? LIVE_SOURCES : SEED_SOURCES;
  return sources.filter(f => f.region === region);
}

/** Returns all feed sources for a given category */
export function getFeedsByCategory(cat: FeedSource['category'], liveOnly = false): FeedSource[] {
  const sources = liveOnly ? LIVE_SOURCES : SEED_SOURCES;
  return sources.filter(f => f.category === cat);
}
