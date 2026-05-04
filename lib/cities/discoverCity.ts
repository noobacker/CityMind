import { getCache, setCache } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';
import type { CityDef, NeighborhoodDef } from './types';

const NOMINATIM_USER_AGENT = 'CityMind/1.0 (https://github.com/noobacker/CityMind)';
const DISCOVERY_TTL = 30 * 24 * 60 * 60 * 1000;

export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  importance: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

interface OverpassPoint {
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function flagFromCountryCode(cc: string): string {
  if (!cc || cc.length !== 2) return '🌍';
  const codePoints = cc.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const TIMEZONE_BY_CC: Record<string, string> = {
  US: 'America/New_York',
  GB: 'Europe/London',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  IT: 'Europe/Rome',
  ES: 'Europe/Madrid',
  NL: 'Europe/Amsterdam',
  TR: 'Europe/Istanbul',
  RU: 'Europe/Moscow',
  CN: 'Asia/Shanghai',
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  IN: 'Asia/Kolkata',
  TH: 'Asia/Bangkok',
  ID: 'Asia/Jakarta',
  PH: 'Asia/Manila',
  SG: 'Asia/Singapore',
  HK: 'Asia/Hong_Kong',
  AE: 'Asia/Dubai',
  SA: 'Asia/Riyadh',
  EG: 'Africa/Cairo',
  NG: 'Africa/Lagos',
  KE: 'Africa/Nairobi',
  ZA: 'Africa/Johannesburg',
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
  CA: 'America/Toronto',
  MX: 'America/Mexico_City',
  BR: 'America/Sao_Paulo',
  AR: 'America/Argentina/Buenos_Aires',
  CL: 'America/Santiago',
  CO: 'America/Bogota',
  PE: 'America/Lima',
};

const FAHRENHEIT_CC = new Set(['US', 'BS', 'BZ', 'KY', 'LR']);

export async function geocodeCity(query: string): Promise<NominatimResult[]> {
  const cleaned = query.trim();
  if (!cleaned) return [];

  const cacheKey = `geocode:${cleaned.toLowerCase()}`;
  const cached = getCache<NominatimResult[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: cleaned,
    format: 'json',
    addressdetails: '1',
    limit: '8',
    'accept-language': 'en',
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT, 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      logFetcher({ source: 'nominatim', status: 'error', detail: `http_${response.status}` });
      return [];
    }
    const data = (await response.json()) as NominatimResult[];

    const cities = data.slice(0, 10);

    setCache(cacheKey, cities, 24 * 60 * 60 * 1000);
    logFetcher({ source: 'nominatim', status: 'live', count: cities.length });
    return cities;
  } catch (e) {
    logFetcher({ source: 'nominatim', status: 'error', detail: 'fetch_failed' });
    return [];
  }
}

async function fetchOverpassPoints(lat: number, lon: number, radiusMeters: number, types: string[]): Promise<OverpassPoint[]> {
  const query = `
    [out:json][timeout:25];
    (
      ${types.map((t) => `node(around:${radiusMeters},${lat},${lon})[place=${t}];`).join('\n')}
    );
    out body 80;
  `.trim();

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': NOMINATIM_USER_AGENT },
      body: `data=${encodeURIComponent(query)}`,
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { elements?: Array<{ lat: number; lon: number; tags?: Record<string, string> }> };
    return (data.elements ?? []).map((el) => ({ lat: el.lat, lon: el.lon, tags: el.tags }));
  } catch {
    return [];
  }
}

function clusterNeighborhoods(points: OverpassPoint[], cityLat: number, cityLon: number): NeighborhoodDef[] {
  const seen = new Set<string>();
  const filtered = points
    .filter((p) => {
      const name = p.tags?.name || p.tags?.['name:en'];
      if (!name) return false;
      const key = name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 48);

  return filtered.map((p) => {
    const name = (p.tags?.['name:en'] || p.tags?.name || 'District').slice(0, 40);
    const angle = Math.atan2(p.lat - cityLat, p.lon - cityLon);
    const deg = (angle * 180) / Math.PI;
    let district = 'central';
    const dist = Math.sqrt((p.lat - cityLat) ** 2 + (p.lon - cityLon) ** 2);
    if (dist < 0.04) district = 'central';
    else if (deg >= -45 && deg < 45) district = 'east';
    else if (deg >= 45 && deg < 135) district = 'north';
    else if (deg >= -135 && deg < -45) district = 'south';
    else district = 'west';

    return { name, district, lat: p.lat, lon: p.lon };
  });
}

function syntheticNeighborhoods(cityName: string, cityLat: number, cityLon: number): NeighborhoodDef[] {
  const ringRadii = [0.012, 0.028, 0.046];
  const sectors = [
    { id: 'central', label: 'Centre', deg: null, ring: 0 },
    { id: 'north', label: 'North', deg: 90, ring: 1 },
    { id: 'east', label: 'East', deg: 0, ring: 1 },
    { id: 'south', label: 'South', deg: -90, ring: 1 },
    { id: 'west', label: 'West', deg: 180, ring: 1 },
    { id: 'north', label: 'NE', deg: 45, ring: 2 },
    { id: 'south', label: 'SE', deg: -45, ring: 2 },
    { id: 'south', label: 'SW', deg: -135, ring: 2 },
    { id: 'north', label: 'NW', deg: 135, ring: 2 },
    { id: 'east', label: 'Far East', deg: 0, ring: 2 },
    { id: 'west', label: 'Far West', deg: 180, ring: 2 },
  ];

  return sectors.map((s, i) => {
    if (s.deg === null) {
      return { name: `${cityName} Centre`, district: 'central', lat: cityLat, lon: cityLon };
    }
    const rad = (s.deg * Math.PI) / 180;
    const r = ringRadii[s.ring];
    return {
      name: `${cityName} ${s.label}`,
      district: s.id,
      lat: cityLat + Math.sin(rad) * r,
      lon: cityLon + Math.cos(rad) * r,
    };
  });
}

export async function discoverCity(input: {
  name: string;
  lat: number;
  lon: number;
  country: string;
  countryCode: string;
}): Promise<CityDef> {
  const cacheKey = `discover:${input.lat.toFixed(3)}:${input.lon.toFixed(3)}`;
  const cached = getCache<CityDef>(cacheKey);
  if (cached) return cached;

  const cc = (input.countryCode || '').toUpperCase();
  
  // Adaptive discovery strategy
  // 1. Try local neighborhoods/villages (20km)
  let points = await fetchOverpassPoints(input.lat, input.lon, 20000, ['suburb', 'neighbourhood', 'borough', 'village', 'hamlet']);

  
  // 2. If too few, try wider area towns/cities (120km)
  if (points.length < 5) {
    points = await fetchOverpassPoints(input.lat, input.lon, 120000, ['city', 'town']);
  }

  // 3. If still too few, try massive scale (450km) for states/provinces
  if (points.length < 5) {
    points = await fetchOverpassPoints(input.lat, input.lon, 450000, ['city', 'town']);
  }

  let neighborhoods = clusterNeighborhoods(points, input.lat, input.lon);
  if (neighborhoods.length < 4) {
    neighborhoods = syntheticNeighborhoods(input.name, input.lat, input.lon);
  }

  const districtIds = Array.from(new Set(neighborhoods.map((n) => n.district)));
  const districtLabels: Record<string, string> = {
    central: 'Centre',
    north: 'North',
    east: 'East',
    south: 'South',
    west: 'West',
  };
  const districts = districtIds.map((id) => ({ id, label: districtLabels[id] || id }));

  const id = `custom_${slugify(input.name)}_${Math.abs(Math.round(input.lat * 100))}_${Math.abs(Math.round(input.lon * 100))}`;

  const city: CityDef = {
    id,
    name: input.name,
    country: input.country,
    countryCode: cc,
    flag: flagFromCountryCode(cc),
    lat: input.lat,
    lon: input.lon,
    timezone: TIMEZONE_BY_CC[cc] || 'UTC',
    zoom: 10.8,
    tempUnit: FAHRENHEIT_CC.has(cc) ? 'F' : 'C',
    districts,
    neighborhoods,
    civicFeed: 'none',
    transitFeed: 'none',
    eventsFeed: 'none',
    isCustom: true,
  };

  setCache(cacheKey, city, DISCOVERY_TTL);
  return city;
}
