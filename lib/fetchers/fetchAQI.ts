import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';
import type { CityDef } from '@/lib/cities/types';

export interface AQIPayload {
  boroughAqi: Record<string, number>;
  boroughPm25: Record<string, number>;
  worstBorough: string;
  overallAqi: number;
  overallPm25: number;
}

function districtCenter(city: CityDef, districtId: string): { lat: number; lon: number } {
  const matches = city.neighborhoods.filter((n) => n.district === districtId);
  if (matches.length === 0) return { lat: city.lat, lon: city.lon };
  const lat = matches.reduce((s, n) => s + n.lat, 0) / matches.length;
  const lon = matches.reduce((s, n) => s + n.lon, 0) / matches.length;
  return { lat, lon };
}

function buildFallback(city: CityDef): AQIPayload {
  const boroughAqi: Record<string, number> = {};
  const boroughPm25: Record<string, number> = {};
  for (const d of city.districts) {
    boroughAqi[d.id] = 2;
    boroughPm25[d.id] = 8;
  }
  const firstLabel = city.districts[0]?.label ?? 'Unknown';
  return {
    boroughAqi,
    boroughPm25,
    worstBorough: firstLabel,
    overallAqi: 2,
    overallPm25: 8,
  };
}

export async function fetchAQI(city: CityDef): Promise<AQIPayload> {
  const cacheKey = `aqi-summary:${city.id}`;
  const cached = getCache<AQIPayload>(cacheKey);
  if (cached) {
    logFetcher({ source: 'AQI', status: 'cache-hit', detail: city.id });
    return cached;
  }

  const key = process.env.OPENWEATHER_KEY;
  if (!key) {
    const fallback = buildFallback(city);
    setCache(cacheKey, fallback, TTL.AQI);
    logFetcher({ source: 'AQI', status: 'fallback', detail: 'missing_OPENWEATHER_KEY' });
    return fallback;
  }

  try {
    const responses = await Promise.all(
      city.districts.map(async (district) => {
        const coords = districtCenter(city, district.id);
        const url =
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${key}`;
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`AQI fetch failed for ${district.id}: ${response.status}`);
        }
        const json = (await response.json()) as {
          list?: Array<{ main?: { aqi?: number }; components?: { pm2_5?: number } }>;
        };
        const snapshot = json.list?.[0];
        return {
          districtId: district.id,
          label: district.label,
          aqi: snapshot?.main?.aqi ?? 2,
          pm25: snapshot?.components?.pm2_5 ?? 8,
        };
      }),
    );

    const boroughAqi: Record<string, number> = {};
    const boroughPm25: Record<string, number> = {};
    for (const row of responses) {
      boroughAqi[row.districtId] = row.aqi;
      boroughPm25[row.districtId] = Math.round(row.pm25);
    }

    const worst = [...responses].sort((a, b) => b.aqi - a.aqi || b.pm25 - a.pm25)[0] ?? responses[0];
    const payload: AQIPayload = {
      boroughAqi,
      boroughPm25,
      worstBorough: worst?.label ?? city.districts[0]?.label ?? 'Unknown',
      overallAqi: worst?.aqi ?? 2,
      overallPm25: Math.round(worst?.pm25 ?? 8),
    };

    setCache(cacheKey, payload, TTL.AQI);
    logFetcher({ source: 'AQI', status: 'live', count: responses.length, detail: city.id });
    return payload;
  } catch (e) {
    const fallback = buildFallback(city);
    setCache(cacheKey, fallback, TTL.AQI);
    logFetcher({ source: 'AQI', status: 'error', detail: 'fetch_failed' });
    return fallback;
  }
}
