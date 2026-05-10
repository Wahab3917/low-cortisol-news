import { Panel } from '../core/Panel';
import { SmartPollLoop } from '../core/SmartPollLoop';
import { appBus } from '../core/EventBus';
import { getFeedsByRegion, getFeedsByCategory } from '../feeds/sources';
import type { Story } from '../../lib/types';

// Mixed sources for the main dashboard
const DASHBOARD_SOURCES = [
  ...getFeedsByRegion('global', true),
  ...getFeedsByCategory('science', true),
  ...getFeedsByCategory('environment', true)
];

function storyCard(s: Story): string {
  const timeAgo = formatTimeAgo(s.pubDate);
  return `
    <article class="story-card" data-href="${escapeAttr(s.link)}" role="button" tabindex="0" aria-label="${escapeAttr(s.title)}">
      ${s.imageUrl ? `<div class="story-image-wrap"><img src="${escapeAttr(s.imageUrl)}" loading="lazy" class="story-image" alt="" /></div>` : ''}
      <div class="story-content">
        <h3 class="story-title">${escapeHtml(s.title)}</h3>
        <time class="story-time">${timeAgo}</time>
      </div>
    </article>`;
}

function loadingHtml(): string {
  return `<div class="panel-loading" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">
    ${Array(4).fill('<div class="skeleton-card"><div class="skeleton-line sk-image"></div><div class="sk-content"><div class="skeleton-line sk-title"></div><div class="skeleton-line sk-body"></div></div></div>').join('')}
  </div>`;
}

function emptyHtml(category?: string): string {
  const msg = category && category !== 'all' 
    ? `No latest news for "${category.charAt(0).toUpperCase() + category.slice(1)}", yet.` 
    : 'No news matches your filters right now.';
    
  return `<div class="panel-empty">
    <p>${msg}</p>
  </div>`;
}

export class LiveFeedPanel extends Panel {
  private stories: Story[] = [];
  private poller: SmartPollLoop;
  private fetchedSources = new Set<string>();
  private activeCategory: string = 'all';
  private displayLimit: number = 8;

  constructor(containerId: string, hydratedData?: Story[]) {
    super(containerId);
    if (hydratedData?.length) {
      this.stories = hydratedData.slice(0, 8);
    }
    this.poller = new SmartPollLoop({
      intervalMs: 5 * 60 * 1000, // 5 minutes
      callback: () => this.fetchFeeds(),
    });
  }

  private visibilityHandler = (): void => {
    if (!document.hidden) this.poller.triggerNow();
  };

  async render(): Promise<void> {
    if (this.stories.length === 0) {
      this.setContent(loadingHtml());
    } else {
      this.renderStories();
    }
    // Fetch from individual feed proxies in the background
    this.poller.start();

    // Resume on visibility change
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private async fetchFeeds(): Promise<void> {
    const toFetch = DASHBOARD_SOURCES.filter(s => !this.fetchedSources.has(s.url));
    if (toFetch.length === 0) {
      this.fetchedSources.clear();
      return;
    }

    // Fetch 3 sources at a time to avoid hammering
    const batch = toFetch.slice(0, 3);
    const results = await Promise.allSettled(batch.map(src =>
      fetch(`/api/feed?url=${encodeURIComponent(src.url)}&name=${encodeURIComponent(src.name)}&region=${src.region}&category=${src.category}`)
        .then(r => r.json() as Promise<Story[]>)
    ));

    let gotNew = false;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        this.mergeStories(r.value);
        gotNew = true;
      }
      this.fetchedSources.add(batch[i].url);
    }

    if (gotNew) {
      this.renderStories();
      appBus.emit('feed:updated', { key: 'feed:positive:global', count: this.stories.length });
      appBus.emit('health:change', { status: 'ok', message: `${this.stories.length} stories loaded` });
    }
  }

  private mergeStories(incoming: Story[]): void {
    const existingLinks = new Set(this.stories.map(s => s.link));
    const existingTitles = new Set(this.stories.map(s => s.title.toLowerCase().slice(0, 60)));

    const fresh = incoming.filter(s =>
      !existingLinks.has(s.link) &&
      !existingTitles.has(s.title.toLowerCase().slice(0, 60))
    );

    // Recency filter: Today or Yesterday
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);

    this.stories = [...fresh, ...this.stories]
      .filter(s => !!s.imageUrl) // Eliminate news without images
      .filter(s => new Date(s.pubDate).getTime() >= yesterdayStart)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 8); // Limit to 8 as requested
  }

  private renderStories(): void {
    let filtered = this.stories;
    if (this.activeCategory !== 'all') {
      filtered = this.stories.filter(s => s.category === this.activeCategory);
    }

    if (filtered.length === 0) {
      this.setContent(emptyHtml(this.activeCategory));
      // Hide "More" button if no stories
      const moreBtn = document.getElementById('show-more-news');
      if (moreBtn) moreBtn.style.display = 'none';
      return;
    }

    const display = filtered.slice(0, this.displayLimit);
    this.setContent(`<div class="story-list" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">${display.map(storyCard).join('')}</div>`);

    // Toggle "More" button visibility
    const moreBtn = document.getElementById('show-more-news');
    if (moreBtn) {
      moreBtn.style.display = filtered.length > this.displayLimit ? 'block' : 'none';
    }
  }

  // Event delegation — never attach listeners inside innerHTML
  protected handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Show more button
    if (target.id === 'show-more-news') {
      this.displayLimit += 8;
      this.renderStories();
      return;
    }

    // Category tabs
    const catBtn = target.closest('.cat-tab') as HTMLElement;
    if (catBtn) {
      const cat = catBtn.dataset.cat!;
      this.activeCategory = cat;
      this.displayLimit = 8; // Reset limit on category change

      // Update UI classes
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.cat === cat));
      this.renderStories();
      return;
    }

    const card = target.closest('.story-card');
    if (card) {
      const href = (card as HTMLElement).dataset.href;
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
    }
  }

  destroy(): void {
    super.destroy();
    this.poller.stop();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }
}

// Utility helpers
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
// function categoryIcon(cat: Story['category']): string {
//   const map: Record<string, string> = {
//     science: '🔬', environment: '🌿', community: '🤝', innovation: '💡', general: '🌍'
//   };
//   return map[cat] ?? '🌍';
// }
function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
  } catch { return ''; }
}
