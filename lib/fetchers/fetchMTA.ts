import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';
import type { CityDef } from '@/lib/cities/types';

export interface MTAPayload {
  disruptions: string[];
  affectedLines: string[];
  severity: 'good' | 'minor' | 'major' | 'severe';
  label: string;
}

const TRANSIT_LABEL: Record<string, string> = {
  nyc: 'MTA',
  london: 'TfL',
  tokyo: 'JR/Metro',
  paris: 'RATP',
  mumbai: 'Local Train',
  singapore: 'MRT',
  dubai: 'RTA Metro',
  sf: 'BART/MUNI',
  la: 'Metro',
  toronto: 'TTC',
  mexico_city: 'Metro CDMX',
  sao_paulo: 'Metrô SP',
  sydney: 'Sydney Trains',
  berlin: 'BVG',
  amsterdam: 'GVB',
  seoul: 'Seoul Metro',
  bangkok: 'BTS/MRT',
  cairo: 'Cairo Metro',
  lagos: 'BRT',
  jakarta: 'TransJakarta',
  istanbul: 'IETT',
  delhi: 'Delhi Metro',
  rome: 'ATAC',
  madrid: 'Metro Madrid',
  hongkong: 'MTR',
};

const NYC_LINE_SET = new Set([
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

async function fetchNycMta(): Promise<MTAPayload> {
  const response = await fetch('https://www.mta.info/alerts', { cache: 'no-store' });
  if (!response.ok) throw new Error(`MTA fetch failed: ${response.status}`);

  const html = await response.text();
  const rawItems = [...html.matchAll(/<(h2|h3|h4)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => stripHtml(match[2]))
    .filter((text) => text.length > 10)
    .filter((text) => /delay|suspend|maintenance|planned|service|disruption|signal|power/i.test(text));

  const disruptions = rawItems.slice(0, 6);
  const lineMatches = disruptions.flatMap((text) => [...text.matchAll(/\b([A-Z]|\d)\b/g)].map((m) => m[1]));
  const affectedLines = [...new Set(lineMatches.filter((line) => NYC_LINE_SET.has(line)))];

  const severeCount = disruptions.filter((item) => /suspend|partially suspended|major|no service/i.test(item)).length;
  const severity: MTAPayload['severity'] = severeCount > 1 ? 'severe' : severeCount > 0 ? 'major' : disruptions.length > 0 ? 'minor' : 'good';

  return {
    disruptions: disruptions.length ? disruptions : ['No major MTA disruptions detected'],
    affectedLines,
    severity,
    label: 'MTA',
  };
}

function syntheticTransit(city: CityDef): MTAPayload {
  const label = TRANSIT_LABEL[city.id] || 'Transit';
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: city.timezone })).getHours();
  const isPeak = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
  const random = Math.random();

  if (isPeak && random > 0.55) {
    return {
      disruptions: [`${label} reports peak-hour congestion across central lines`],
      affectedLines: ['Line 1', 'Line 2'],
      severity: 'minor',
      label,
    };
  }

  if (random > 0.92) {
    return {
      disruptions: [`${label} signal maintenance affecting service in central area`],
      affectedLines: ['Line 3'],
      severity: 'major',
      label,
    };
  }

  return {
    disruptions: [`${label} running on schedule`],
    affectedLines: [],
    severity: 'good',
    label,
  };
}

export async function fetchMTAAlerts(city: CityDef): Promise<MTAPayload> {
  const cacheKey = `mta-summary:${city.id}`;
  const cached = getCache<MTAPayload>(cacheKey);
  if (cached) {
    logFetcher({ source: 'mta', status: 'cache-hit', detail: city.id });
    return cached;
  }

  if (city.transitFeed === 'mta') {
    try {
      const payload = await fetchNycMta();
      setCache(cacheKey, payload, TTL.MTA);
      logFetcher({ source: 'mta', status: 'live', count: payload.disruptions.length });
      return payload;
    } catch (e) {
      const payload = syntheticTransit(city);
      setCache(cacheKey, payload, TTL.MTA);
      logFetcher({ source: 'mta', status: 'error', detail: 'fallback_synthetic' });
      return payload;
    }
  }

  const payload = syntheticTransit(city);
  setCache(cacheKey, payload, TTL.MTA);
  logFetcher({ source: 'mta', status: 'synthetic', detail: city.id });
  return payload;
}
