import type { Story } from '../../lib/types';

interface RawItem {
  title: string;
  summary: string;
  link: string;
  pubDate: string;
}

/**
 * Parses an RSS 2.0 or Atom feed XML string into an array of raw story items.
 * Works in both browser (DOMParser) and Node.js (caller must supply a parser).
 */
export function parseRSS(xml: string, sourceName: string, source: string, region: Story['region'], category: Story['category']): Story[] {
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xml, 'application/xml');
  } catch {
    return [];
  }

  // Check for parse error
  if (doc.querySelector('parsererror')) return [];

  const items = doc.querySelectorAll('item, entry');
  const stories: Story[] = [];

  for (const item of items) {
    const title = getText(item, 'title');
    if (!title) continue;

    const link =
      getText(item, 'link') ||
      item.querySelector('link')?.getAttribute('href') ||
      '';

    const summary = stripHtml(
      getText(item, 'description') ||
      getText(item, 'summary') ||
      getText(item, 'content') ||
      ''
    ).slice(0, 300);

    const pubDateRaw =
      getText(item, 'pubDate') ||
      getText(item, 'published') ||
      getText(item, 'updated') ||
      '';

    let imageUrl = '';
    try {
      const itemXml = new XMLSerializer().serializeToString(item);
      const mediaMatch = itemXml.match(/<(?:media:content|content)[^>]+url=["']([^"']+)["']/i);
      const thumbMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
      const encMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i);
      const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
      const imageTagMatch = itemXml.match(/<image>[^<]*<url>([^<]+)<\/url>/i);

      imageUrl = mediaMatch?.[1] || thumbMatch?.[1] || encMatch?.[1] || imgMatch?.[1] || imageTagMatch?.[1] || '';
    } catch {
      // fallback if XMLSerializer not available in some edge environments
      const desc = getText(item, 'description') || getText(item, 'summary') || '';
      const fallbackImg = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (fallbackImg) imageUrl = fallbackImg[1];
    }

    stories.push({
      title,
      summary,
      link,
      pubDate: pubDateRaw,
      source,
      sourceName,
      region,
      category,
      imageUrl,
    });
  }

  return stories;
}

function getText(parent: Element, tag: string): string {
  return parent.querySelector(tag)?.textContent?.trim() ?? '';
}

function stripHtml(html: string): string {
  // Remove tags and decode common entities
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse a numeric djb2 hash from a string — used for classifier dedup. */
export function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // force unsigned 32-bit
  }
  return hash;
}

export function rawToPartial(raw: RawItem, sourceName: string, source: string, region: Story['region'], category: Story['category']): Story {
  return { ...raw, sourceName, source, region, category };
}
