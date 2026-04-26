import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';

export interface MTAPayload {
  disruptions: string[];
  affectedLines: string[];
  severity: 'good' | 'minor' | 'major' | 'severe';
}

const LINE_SET = new Set([
  '1', '2', '3', '4', '5', '6', '7',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'J', 'L', 'M', 'N', 'Q', 'R', 'W', 'Z',
]);

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchMTAAlerts(): Promise<MTAPayload> {
  const strategy = (process.env.MTA_STRATEGY || 'alerts-page').toLowerCase();
  const cached = getCache<MTAPayload>('mta-summary');
  if (cached) {
    logFetcher({ source: 'mta', status: 'cache-hit', detail: strategy });
    return cached;
  }

  if (strategy === 'gtfs-rt') {
    // Chosen default for now: hardened alerts-page scraping for reliability and speed.
    logFetcher({ source: 'mta', status: 'fallback', detail: 'gtfs-rt_not_enabled_using_alerts_page' });
  }

  const response = await fetch('https://www.mta.info/alerts', { cache: 'no-store' });
  if (!response.ok) {
    logFetcher({ source: 'mta', status: 'error', detail: `http_${response.status}` });
    throw new Error(`MTA fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const rawItems = [...html.matchAll(/<(h2|h3|h4)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => stripHtml(match[2]))
    .filter((text) => text.length > 10)
    .filter((text) => /delay|suspend|maintenance|planned|service|disruption|signal|power/i.test(text));

  const disruptions = rawItems.slice(0, 6);
  const lineMatches = disruptions.flatMap((text) => [...text.matchAll(/\b([A-Z]|\d)\b/g)].map((match) => match[1]));
  const affectedLines = [...new Set(lineMatches.filter((line) => LINE_SET.has(line)))];

  const severeCount = disruptions.filter((item) => /suspend|partially suspended|major|no service/i.test(item)).length;
  const severity: MTAPayload['severity'] = severeCount > 1 ? 'severe' : severeCount > 0 ? 'major' : disruptions.length > 0 ? 'minor' : 'good';

  const payload: MTAPayload = {
    disruptions: disruptions.length ? disruptions : ['No major MTA disruptions detected'],
    affectedLines,
    severity,
  };

  setCache('mta-summary', payload, TTL.MTA);
  logFetcher({ source: 'mta', status: 'live', detail: strategy, count: payload.disruptions.length });
  return payload;
}