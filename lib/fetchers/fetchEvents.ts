import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';
import type { CityDef } from '@/lib/cities/types';

export interface EventsPayload {
  events: string[];
}

interface EventRow {
  event_name?: string;
  event_type?: string;
}

const SYNTHETIC_EVENT_TEMPLATES = [
  '{name} cultural festival',
  'Live music night across {name}',
  'Street market open in {district}',
  '{name} marathon route active',
  'Outdoor cinema in {district}',
  'Food festival in {district}',
  'Public art exhibit in {district}',
];

function syntheticEvents(city: CityDef): EventsPayload {
  const random = Math.random();
  if (random < 0.35) {
    return { events: ['No major permitted events right now'] };
  }
  const districts = city.districts;
  const count = 1 + Math.floor(Math.random() * 3);
  const events: string[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = SYNTHETIC_EVENT_TEMPLATES[Math.floor(Math.random() * SYNTHETIC_EVENT_TEMPLATES.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    events.push(tpl.replace('{name}', city.name).replace('{district}', district?.label ?? city.name));
  }
  return { events };
}

async function fetchNycEvents(): Promise<EventsPayload> {
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    '$select': 'event_name,event_type,start_date_time',
    '$where': `start_date_time >= '${today}T00:00:00'`,
    '$limit': '50',
  });
  const token = process.env.NYC_OPEN_DATA_TOKEN;
  if (token) params.set('$$app_token', token);

  const url = `https://data.cityofnewyork.us/resource/tvpp-9vvx.json?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Events fetch failed: ${response.status}`);

  const rows = (await response.json()) as EventRow[];
  const events = rows
    .map((row) => row.event_name?.trim() || row.event_type?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 5);

  return { events: events.length ? events : ['No major permitted events right now'] };
}

export async function fetchEvents(city: CityDef): Promise<EventsPayload> {
  const cacheKey = `events-summary:${city.id}`;
  const cached = getCache<EventsPayload>(cacheKey);
  if (cached) {
    logFetcher({ source: 'events', status: 'cache-hit', count: cached.events.length, detail: city.id });
    return cached;
  }

  if (city.eventsFeed === 'nyc') {
    try {
      const payload = await fetchNycEvents();
      setCache(cacheKey, payload, TTL.EVENTS);
      logFetcher({ source: 'events', status: 'live', count: payload.events.length });
      return payload;
    } catch (e) {
      const payload = syntheticEvents(city);
      setCache(cacheKey, payload, TTL.EVENTS);
      logFetcher({ source: 'events', status: 'error', detail: 'fallback_synthetic' });
      return payload;
    }
  }

  const payload = syntheticEvents(city);
  setCache(cacheKey, payload, TTL.EVENTS);
  logFetcher({ source: 'events', status: 'synthetic', count: payload.events.length, detail: city.id });
  return payload;
}
