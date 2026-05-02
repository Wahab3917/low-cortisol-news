import { Panel } from '../core/Panel';
import { SmartPollLoop } from '../core/SmartPollLoop';

interface BriefResponse {
  brief: string | null;
  cached?: boolean;
  reason?: string;
}

export class DailyBriefPanel extends Panel {
  private brief: string | null = null;
  private generatedAt: Date | null = null;
  private poller: SmartPollLoop;

  constructor(containerId: string, hydratedBrief?: string) {
    super(containerId);
    if (hydratedBrief) {
      this.brief = hydratedBrief;
      this.generatedAt = new Date();
    }
    this.poller = new SmartPollLoop({
      intervalMs: 60 * 60 * 1000, // poll every hour — brief is cached 8h in Redis
      callback: () => this.fetchBrief(),
    });
  }

  async render(): Promise<void> {
    this.renderBrief();
    this.poller.start();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.brief) this.poller.triggerNow();
    });
  }

  private async fetchBrief(): Promise<void> {
    try {
      const data = await fetch('/api/brief').then(r => r.json()) as BriefResponse;
      if (data.brief) {
        this.brief = data.brief;
        this.generatedAt = new Date();
        this.renderBrief();
      } else if (!this.brief) {
        this.renderPending(data.reason);
      }
    } catch {
      if (!this.brief) this.renderPending('Connection issue — retrying…');
    }
  }

  private renderBrief(): void {
    if (!this.brief) {
      this.renderPending();
      return;
    }
    const timeStr = this.generatedAt
      ? this.generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    this.setContent(`
      <div class="brief-container">
        <div class="brief-icon">☀️</div>
        <blockquote class="brief-text">${escapeHtml(this.brief)}</blockquote>
        <div class="brief-footer">
          <span class="brief-label">AI-generated summary · Low Cortisol News</span>
          ${timeStr ? `<time class="brief-time">Generated at ${timeStr}</time>` : ''}
        </div>
        <button class="brief-refresh" id="btn-refresh-brief">↻ Refresh brief</button>
      </div>
    `);
  }

  private renderPending(reason?: string): void {
    this.setContent(`
      <div class="panel-empty">
        <span class="empty-icon">📋</span>
        <p>${reason ?? 'Generating today\'s briefing…'}</p>
        <div class="brief-progress">
          <div class="brief-progress-bar"></div>
        </div>
      </div>
    `);
  }

  protected handleClick(e: MouseEvent): void {
    const btn = (e.target as Element).closest('#btn-refresh-brief');
    if (btn) {
      this.brief = null;
      this.renderPending('Requesting fresh brief…');
      this.poller.triggerNow();
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
