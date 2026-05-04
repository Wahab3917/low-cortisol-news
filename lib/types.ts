export interface Story {
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  source: string;
  sourceName: string;
  region: 'global' | 'pakistan';
  category: 'general' | 'science' | 'environment' | 'community' | 'innovation';
  score?: number;
  isPakistan?: boolean;
  imageUrl?: string;
}

export interface FeedSource {
  url: string;
  name: string;
  category: 'global' | 'science' | 'environment' | 'community' | 'innovation';
  region: 'global' | 'pakistan';
  tier: 1 | 2 | 3; // 1=wire/authoritative, 2=major, 3=aggregator
  isLive?: boolean; // if true, the frontend can poll this feed directly via api/feed proxy
}

export interface ClassificationResult {
  score: number;
  category: string;
  isPakistan: boolean;
  pass: boolean;
}

export interface BootstrapPayload {
  'feed:positive:global'?: Story[];
  'feed:positive:pakistan'?: Story[];
  'feed:science'?: Story[];
  'feed:environment'?: Story[];
  'feed:innovation'?: Story[];
  'feed:community'?: Story[];
  'brief:daily'?: string;
}
