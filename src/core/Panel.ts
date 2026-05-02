export abstract class Panel {
  protected container: HTMLElement;
  protected content: HTMLElement;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.content = this.container.querySelector('.panel-content')!;
    // Event delegation — bind to stable container, never to inner elements
    this.content.addEventListener('click', (e) => this.handleClick(e));
  }

  protected setContent(html: string): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.content.innerHTML = html;
    }, 150);
  }

  /** Override in subclasses to handle clicks on story cards etc. */
  protected handleClick(_e: MouseEvent): void {}

  abstract render(): Promise<void>;

  destroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
}
