import { Panel } from '../core/Panel';
import { SmartPollLoop } from '../core/SmartPollLoop';
import { getFeedsByRegion } from '../feeds/sources';
import type { Story } from '../../lib/types';

const PAK_SOURCES = getFeedsByRegion('pakistan', true);

function storyCard(s: Story): string {
  const timeAgo = formatTimeAgo(s.pubDate);
  return `
    <article class="story-card story-card--pak" data-href="${escapeAttr(s.link)}" role="button" tabindex="0" aria-label="${escapeAttr(s.title)}">
      ${s.imageUrl ? `<div class="story-image-wrap"><img src="${escapeAttr(s.imageUrl)}" loading="lazy" class="story-image" alt="" /></div>` : ''}
      <div class="story-content">
        <h3 class="story-title">${escapeHtml(s.title)}</h3>
        <time class="story-time">${timeAgo}</time>
      </div>
    </article>`;
}

export class PakistanPanel extends Panel {
  private stories: Story[] = [];
  private poller: SmartPollLoop;

  constructor(containerId: string, hydratedData?: Story[]) {
    super(containerId);
    // Accept both "pakistan"-region data from bootstrap AND filter from global if needed
    if (hydratedData?.length) {
      this.stories = hydratedData.filter(s => s.region === 'pakistan' || s.isPakistan);
    }
    this.poller = new SmartPollLoop({
      intervalMs: 7 * 60 * 1000, // 7 minutes — slightly staggered from LiveFeed
      callback: () => this.fetchFeeds(),
    });
  }

  private visibilityHandler = (): void => {
    if (!document.hidden) this.poller.triggerNow();
  };

  async render(): Promise<void> {
    this.renderStories();
    this.poller.start();
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private async fetchFeeds(): Promise<void> {
    const results = await Promise.allSettled(PAK_SOURCES.map(src =>
      fetch(`/api/feed?url=${encodeURIComponent(src.url)}&name=${encodeURIComponent(src.name)}&region=pakistan&category=${src.category}`)
        .then(r => r.json() as Promise<Story[]>)
    ));

    let gotNew = false;
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        this.mergeStories(r.value);
        gotNew = true;
      }
    }
    if (gotNew) this.renderStories();
  }

  private mergeStories(incoming: Story[]): void {
    const existing = new Set(this.stories.map(s => s.link));
    const fresh = incoming.filter(s => !existing.has(s.link));

    // Recency filter: Today or Yesterday
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);

    this.stories = [...fresh, ...this.stories]
      .filter(s => new Date(s.pubDate).getTime() >= yesterdayStart)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 12);
  }

  private renderStories(): void {
    if (this.stories.length === 0) {
      this.setContent(`<div class="panel-empty">
        <p class="panel-empty-sub">Loading…</p>
      </div>`);
      return;
    }
    this.setContent(`<div class="story-list">${this.stories.map(storyCard).join('')}</div>`);
  }

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ''; }
}
