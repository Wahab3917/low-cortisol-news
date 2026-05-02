interface PollOptions {
  intervalMs: number;
  callback: () => Promise<void>;
  backoffMultiplier?: number; // default 2
  maxBackoff?: number;        // default 4x base interval
  hiddenMultiplier?: number;  // default 5
}

export class SmartPollLoop {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private running = false;

  constructor(private options: PollOptions) {}

  start(): void {
    this.running = true;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }

  /** Cancel the current schedule and run immediately. */
  triggerNow(): void {
    if (this.timer) clearTimeout(this.timer);
    this.run();
  }

  private async run(): Promise<void> {
    try {
      await this.options.callback();
      this.failures = 0;
    } catch {
      this.failures++;
    }
    if (this.running) this.schedule();
  }

  private schedule(): void {
    const base = this.options.intervalMs;
    const backoff = Math.min(
      Math.pow(this.options.backoffMultiplier ?? 2, this.failures),
      this.options.maxBackoff ?? 4
    );
    const hidden = document.hidden ? (this.options.hiddenMultiplier ?? 5) : 1;
    const jitter = 0.9 + Math.random() * 0.2; // ±10%
    const interval = base * backoff * hidden * jitter;
    this.timer = setTimeout(() => this.run(), interval);
  }
}
