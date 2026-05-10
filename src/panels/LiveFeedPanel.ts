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
  const catIcon = categoryIcon(s.category);
  return `
    <article class="story-card" data-href="${escapeAttr(s.link)}" role="button" tabindex="0" aria-label="${escapeAttr(s.title)}">
      ${s.imageUrl ? `<div class="story-image-wrap"><img src="${escapeAttr(s.imageUrl)}" loading="lazy" class="story-image" alt="" /></div>` : ''}
      <div class="story-content">
        <div class="story-meta">
          <span class="story-source">${catIcon} ${escapeHtml(s.sourceName)}</span>
          <time class="story-time">${timeAgo}</time>
        </div>
        <h3 class="story-title">${escapeHtml(s.title)}</h3>
        ${s.summary ? `<p class="story-summary">${escapeHtml(s.summary)}</p>` : ''}
      </div>
    </article>`;
}

function loadingHtml(): string {
  return `<div class="panel-loading" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">
    ${Array(6).fill('<div class="skeleton-card"><div class="skeleton-line sk-image"></div><div class="sk-content"><div class="skeleton-line sk-title"></div><div class="skeleton-line sk-body"></div></div></div>').join('')}
  </div>`;
}

function emptyHtml(): string {
  return `<div class="panel-empty">
    <span class="empty-icon">☀️</span>
    <p>Good news is on its way — checking sources now…</p>
  </div>`;
}

export class LiveFeedPanel extends Panel {
  private stories: Story[] = [];
  private poller: SmartPollLoop;
  private fetchedSources = new Set<string>();

  constructor(containerId: string, hydratedData?: Story[]) {
    super(containerId);
    if (hydratedData?.length) {
      this.stories = hydratedData;
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
      .filter(s => new Date(s.pubDate).getTime() >= yesterdayStart)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 12); // Limit to 12 as requested
  }

  private renderStories(): void {
    if (this.stories.length === 0) {
      this.setContent(emptyHtml());
      return;
    }
    this.setContent(`<div class="story-list" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">${this.stories.map(storyCard).join('')}</div>`);
  }

  // Event delegation — never attach listeners inside innerHTML
  protected handleClick(e: MouseEvent): void {
    const card = (e.target as Element).closest('.story-card');
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
function categoryIcon(cat: Story['category']): string {
  const map: Record<string, string> = {
    science: '🔬', environment: '🌿', community: '🤝', innovation: '💡', general: '🌍'
  };
  return map[cat] ?? '🌍';
}
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
