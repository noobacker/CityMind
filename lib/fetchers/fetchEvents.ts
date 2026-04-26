import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';

export interface EventsPayload {
  events: string[];
}

interface EventRow {
  event_name?: string;
  event_type?: string;
}

export async function fetchEvents(): Promise<EventsPayload> {
  const cached = getCache<EventsPayload>('events-summary');
  if (cached) {
    logFetcher({ source: 'events', status: 'cache-hit', count: cached.events.length });
    return cached;
  }

  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    '$select': 'event_name,event_type,start_date_time',
    '$where': `start_date_time >= '${today}T00:00:00'`,
    '$limit': '50',
  });

  const token = process.env.NYC_OPEN_DATA_TOKEN;
  if (token) {
    params.set('$$app_token', token);
  }

  const url = `https://data.cityofnewyork.us/resource/tvpp-9vvx.json?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    logFetcher({ source: 'events', status: 'error', detail: `http_${response.status}` });
    throw new Error(`Events fetch failed: ${response.status}`);
  }

  const rows = (await response.json()) as EventRow[];
  const events = rows
    .map((row) => row.event_name?.trim() || row.event_type?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 5);

  const payload: EventsPayload = {
    events: events.length ? events : ['No major permitted events right now'],
  };

  setCache('events-summary', payload, TTL.EVENTS);
  logFetcher({ source: 'events', status: 'live', count: payload.events.length });
  return payload;
}