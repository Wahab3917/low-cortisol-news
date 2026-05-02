import { Panel } from '../core/Panel';
import { SmartPollLoop } from '../core/SmartPollLoop';
import { FEED_SOURCES } from '../feeds/sources';
import type { Story } from '../types';

const SCI_SOURCES = FEED_SOURCES.filter(s => s.category === 'science');

function storyCard(s: Story): string {
  const timeAgo = formatTimeAgo(s.pubDate);
  return `
    <article class="story-card story-card--science" data-href="${escapeAttr(s.link)}" role="button" tabindex="0" aria-label="${escapeAttr(s.title)}">
      ${s.imageUrl ? `<div class="story-image-wrap"><img src="${escapeAttr(s.imageUrl)}" loading="lazy" class="story-image" alt="" /></div>` : ''}
      <div class="story-content">
        <div class="story-meta">
          <span class="story-source">🔬 ${escapeHtml(s.sourceName)}</span>
          <time class="story-time">${timeAgo}</time>
        </div>
        <h3 class="story-title">${escapeHtml(s.title)}</h3>
        ${s.summary ? `<p class="story-summary">${escapeHtml(s.summary)}</p>` : ''}
      </div>
    </article>`;
}

export class SciencePanel extends Panel {
  private stories: Story[] = [];
  private poller: SmartPollLoop;

  constructor(containerId: string, hydratedData?: Story[]) {
    super(containerId);
    if (hydratedData?.length) this.stories = hydratedData;
    this.poller = new SmartPollLoop({
      intervalMs: 10 * 60 * 1000, // science updates slower — 10 min
      callback: () => this.fetchFeeds(),
    });
  }

  async render(): Promise<void> {
    this.renderStories();
    this.poller.start();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.poller.triggerNow();
    });
  }

  private async fetchFeeds(): Promise<void> {
    const results = await Promise.allSettled(SCI_SOURCES.map(src =>
      fetch(`/api/feed?url=${encodeURIComponent(src.url)}&name=${encodeURIComponent(src.name)}&region=${src.region}&category=science`)
        .then(r => r.json() as Promise<Story[]>)
    ));

    let gotNew = false;
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        const existing = new Set(this.stories.map(s => s.link));
        const fresh = r.value.filter(s => !existing.has(s.link));
        if (fresh.length) {
          this.stories = [...fresh, ...this.stories].slice(0, 30);
          gotNew = true;
        }
      }
    }
    if (gotNew) this.renderStories();
  }

  private renderStories(): void {
    if (this.stories.length === 0) {
      this.setContent(`<div class="panel-empty">
        <span class="empty-icon">🔭</span>
        <p>Scanning the frontiers of human knowledge…</p>
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
