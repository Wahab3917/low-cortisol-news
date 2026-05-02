import { LiveFeedPanel } from './panels/LiveFeedPanel';
import { PakistanPanel } from './panels/PakistanPanel';
import { SciencePanel } from './panels/SciencePanel';
import { DailyBriefPanel } from './panels/DailyBriefPanel';
import { appBus } from './core/EventBus';
import type { BootstrapPayload, Story } from './types';

// ────────────────────────────────────────
// Bootstrap hydration
// ────────────────────────────────────────
const hydrationCache: Partial<BootstrapPayload> = {};

async function bootstrap(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 800);

  try {
    const [fast, slow] = await Promise.allSettled([
      fetch('/api/bootstrap?tier=fast', { signal: controller.signal }).then(r => r.json() as Promise<BootstrapPayload>),
      fetch('/api/bootstrap?tier=slow', { signal: controller.signal }).then(r => r.json() as Promise<BootstrapPayload>),
    ]);
    if (fast.status === 'fulfilled') Object.assign(hydrationCache, fast.value);
    if (slow.status === 'fulfilled') Object.assign(hydrationCache, slow.value);
  } catch { /* render with empty state — panels will self-fetch */ }

  clearTimeout(timeout);
}

function getHydratedData<K extends keyof BootstrapPayload>(key: K): BootstrapPayload[K] | null {
  const data = hydrationCache[key] ?? null;
  delete hydrationCache[key]; // one-time read
  return data;
}

// ────────────────────────────────────────
// Health dot
// ────────────────────────────────────────
function setupHealthDot(): void {
  const dot = document.getElementById('health-dot');
  if (!dot) return;

  appBus.on('health:change', ({ status, message }) => {
    dot.className = `health-dot ${status}`;
    dot.title = `Feed status: ${message}`;
  });
}

// ────────────────────────────────────────
// Tab switching (client-side only)
// ────────────────────────────────────────
function setupTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-tab]');
  const panels = document.querySelectorAll<HTMLElement>('.panel');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab!;

      // Update tab active states
      tabs.forEach(b => {
        const isActive = b.dataset.tab === tab;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', String(isActive));
      });

      // Show/hide panels
      panels.forEach(p => {
        const isActive = p.id === `panel-${tab}`;
        p.classList.toggle('hidden', !isActive);
        p.setAttribute('aria-hidden', String(!isActive));
      });

      appBus.emit('tab:change', { tab });
    });
  });
}

// ────────────────────────────────────────
// Keyboard accessibility for tab buttons
// ────────────────────────────────────────
function setupKeyboardNavigation(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-tab]');
  tabs.forEach((btn, i) => {
    btn.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        const next = tabs[(i + 1) % tabs.length];
        next.focus();
        next.click();
      } else if (e.key === 'ArrowLeft') {
        const prev = tabs[(i - 1 + tabs.length) % tabs.length];
        prev.focus();
        prev.click();
      }
    });
  });
}

// ────────────────────────────────────────
// IndexedDB fallback cache
// ────────────────────────────────────────
async function saveToIDB(key: string, data: unknown): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put({ key, data, ts: Date.now() });
  } catch { /* IDB unavailable in some environments */ }
}


let idbPromise: Promise<IDBDatabase> | null = null;
function openIDB(): Promise<IDBDatabase> {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('low-cortisol-news', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('cache', { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
}

// ────────────────────────────────────────
// Save feed data to IDB when it updates
// ────────────────────────────────────────
function setupIDBPersistence(): void {
  appBus.on('feed:updated', ({ key, count }) => {
    if (count > 0) saveToIDB(key, count).catch(() => {});
  });
}

// ────────────────────────────────────────
// Main init
// ────────────────────────────────────────
async function init(): Promise<void> {
  setupHealthDot();
  setupTabs();
  setupKeyboardNavigation();
  setupIDBPersistence();

  // Fire bootstrap hydration (aborts after 800ms to not block first paint)
  await bootstrap();

  const liveData = getHydratedData('feed:positive:global') as Story[] | null;
  const pakData  = getHydratedData('feed:positive:pakistan') as Story[] | null;
  const sciData  = getHydratedData('feed:science') as Story[] | null;
  const briefData = getHydratedData('brief:daily') as string | null;

  // Mount panels — always render even if hydration is empty
  const livePanel  = new LiveFeedPanel('panel-live',     liveData ?? undefined);
  const pakPanel   = new PakistanPanel('panel-pakistan', pakData  ?? undefined);
  const sciPanel   = new SciencePanel('panel-science',   sciData  ?? undefined);
  const briefPanel = new DailyBriefPanel('panel-brief',  briefData ?? undefined);

  await Promise.all([
    livePanel.render(),
    pakPanel.render(),
    sciPanel.render(),
    briefPanel.render(),
  ]);

  // Signal initial health state
  if (liveData?.length) {
    appBus.emit('health:change', { status: 'ok', message: `${liveData.length} stories from cache` });
  } else {
    appBus.emit('health:change', { status: 'warn', message: 'Loading stories…' });
  }
}

init();

// Cleanup on nav away (SPA would call panel.destroy() here)
window.addEventListener('beforeunload', () => {
  // Panels automatically stop their pollers via destroy()
});
