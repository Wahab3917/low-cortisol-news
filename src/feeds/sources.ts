import type { FeedSource } from '../types.ts';

export const FEED_SOURCES: FeedSource[] = [
  // Global positive
  { url: 'https://www.positive.news/feed/', name: 'Positive News', category: 'global', region: 'global', tier: 1 },
  { url: 'https://www.goodnewsnetwork.org/feed/', name: 'Good News Network', category: 'global', region: 'global', tier: 2 },
  { url: 'https://www.optimistdaily.com/feed/', name: 'Optimist Daily', category: 'global', region: 'global', tier: 2 },
  { url: 'https://reasonstobecheerful.world/feed/', name: 'Reasons to be Cheerful', category: 'global', region: 'global', tier: 2 },
  { url: 'https://www.yesmagazine.org/rss', name: 'Yes! Magazine', category: 'community', region: 'global', tier: 2 },
  { url: 'https://greatergood.berkeley.edu/feeds/news', name: 'Greater Good', category: 'community', region: 'global', tier: 2 },
  { url: 'https://news.un.org/feed/subscribe/en/news/topic/economic-development/feed/rss.xml', name: 'UN Brighter World', category: 'global', region: 'global', tier: 1 },

  // Science & discovery
  { url: 'https://news.mit.edu/rss/research', name: 'MIT News', category: 'science', region: 'global', tier: 1 },
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', name: 'NASA News', category: 'science', region: 'global', tier: 1 },
  { url: 'https://www.who.int/rss-feeds/news-english.xml', name: 'WHO News', category: 'science', region: 'global', tier: 1 },
  { url: 'https://www.sciencedaily.com/rss/top/science.xml', name: 'Science Daily', category: 'science', region: 'global', tier: 2 },
  { url: 'https://www.newscientist.com/feed/home/', name: 'New Scientist', category: 'science', region: 'global', tier: 2 },

  // Environment & conservation
  { url: 'https://www.worldwildlife.org/stories.rss', name: 'WWF Stories', category: 'environment', region: 'global', tier: 1 },
  { url: 'https://www.mongabay.com/feed/', name: 'Mongabay', category: 'environment', region: 'global', tier: 2 },
  { url: 'https://ourworldindata.org/atom.xml', name: 'Our World in Data', category: 'science', region: 'global', tier: 1 },

  // Pakistan region
  { url: 'https://www.dawn.com/feeds/home', name: 'Dawn', category: 'global', region: 'pakistan', tier: 1 },
  { url: 'https://www.thenews.com.pk/rss/1/7', name: 'The News', category: 'global', region: 'pakistan', tier: 1 },
  { url: 'https://tribune.com.pk/feed/home', name: 'Express Tribune', category: 'global', region: 'pakistan', tier: 1 },
  { url: 'https://propakistani.pk/feed/', name: 'ProPakistani', category: 'innovation', region: 'pakistan', tier: 2 },
  { url: 'https://pakwired.com/feed/', name: 'PakWired', category: 'innovation', region: 'pakistan', tier: 2 },
];

/** Returns all feed sources for a given region */
export function getFeedsByRegion(region: 'global' | 'pakistan'): FeedSource[] {
  return FEED_SOURCES.filter(f => f.region === region);
}

/** Returns all feed sources for a given category */
export function getFeedsByCategory(cat: FeedSource['category']): FeedSource[] {
  return FEED_SOURCES.filter(f => f.category === cat);
}
