// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventMap = Record<string, any>;

export class EventBus<T extends EventMap> {
  private target = new EventTarget();

  emit<K extends keyof T & string>(event: K, detail: T[K]): void {
    this.target.dispatchEvent(new CustomEvent(event, { detail }));
  }

  on<K extends keyof T & string>(event: K, handler: (detail: T[K]) => void): () => void {
    const listener = (e: Event) => handler((e as CustomEvent<T[K]>).detail);
    this.target.addEventListener(event, listener);
    return () => this.target.removeEventListener(event, listener);
  }

  once<K extends keyof T & string>(event: K, handler: (detail: T[K]) => void): void {
    const off = this.on(event, (detail) => { handler(detail); off(); });
  }
}

// Shared global bus for cross-panel communication
export interface AppEvents {
  'feed:updated': { key: string; count: number };
  'health:change': { status: 'ok' | 'warn' | 'error'; message: string };
  'tab:change': { tab: string };
}

export const appBus = new EventBus<AppEvents>();
