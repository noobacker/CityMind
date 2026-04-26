import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';

export interface AQIPayload {
  boroughAqi: Record<'manhattan' | 'brooklyn' | 'bronx' | 'queens' | 'statenIsland', number>;
  boroughPm25: Record<'manhattan' | 'brooklyn' | 'bronx' | 'queens' | 'statenIsland', number>;
  worstBorough: string;
  overallAqi: number;
  overallPm25: number;
}

const BOROUGH_CENTERS = {
  manhattan: { lat: 40.7831, lon: -73.9712, label: 'Manhattan' },
  brooklyn: { lat: 40.6782, lon: -73.9442, label: 'Brooklyn' },
  bronx: { lat: 40.8448, lon: -73.8648, label: 'The Bronx' },
  queens: { lat: 40.7282, lon: -73.7949, label: 'Queens' },
  statenIsland: { lat: 40.5795, lon: -74.1502, label: 'Staten Island' },
} as const;

export async function fetchAQI(): Promise<AQIPayload> {
  const cached = getCache<AQIPayload>('aqi-summary');
  if (cached) {
    logFetcher({ source: 'AQI', status: 'cache-hit' });
    return cached;
  }

  const key = process.env.OPENWEATHER_KEY;
  if (!key) {
    const fallback: AQIPayload = {
      boroughAqi: { manhattan: 2, brooklyn: 2, bronx: 3, queens: 2, statenIsland: 2 },
      boroughPm25: { manhattan: 7, brooklyn: 8, bronx: 11, queens: 7, statenIsland: 6 },
      worstBorough: 'The Bronx',
      overallAqi: 3,
      overallPm25: 11,
    };
    setCache('aqi-summary', fallback, TTL.AQI);
    logFetcher({ source: 'AQI', status: 'fallback', detail: 'missing_OPENWEATHER_KEY' });
    return fallback;
  }

  const boroughKeys = Object.keys(BOROUGH_CENTERS) as Array<keyof typeof BOROUGH_CENTERS>;
  const responses = await Promise.all(
    boroughKeys.map(async (borough) => {
      const coords = BOROUGH_CENTERS[borough];
      const url =
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${key}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        logFetcher({ source: 'AQI', status: 'error', detail: `http_${response.status}_${borough}` });
        throw new Error(`AQI fetch failed for ${borough}: ${response.status}`);
      }
      const json = (await response.json()) as {
        list?: Array<{
          main?: { aqi?: number };
          components?: { pm2_5?: number };
        }>;
      };
      const snapshot = json.list?.[0];
      return {
        borough,
        aqi: snapshot?.main?.aqi ?? 2,
        pm25: snapshot?.components?.pm2_5 ?? 8,
      };
    }),
  );

  const boroughAqi = {
    manhattan: 2,
    brooklyn: 2,
    bronx: 2,
    queens: 2,
    statenIsland: 2,
  };
  const boroughPm25 = {
    manhattan: 8,
    brooklyn: 8,
    bronx: 8,
    queens: 8,
    statenIsland: 8,
  };

  for (const row of responses) {
    boroughAqi[row.borough] = row.aqi;
    boroughPm25[row.borough] = Math.round(row.pm25);
  }

  const worst = responses.sort((a, b) => b.aqi - a.aqi || b.pm25 - a.pm25)[0] ?? { borough: 'bronx', aqi: 2, pm25: 8 };
  const payload: AQIPayload = {
    boroughAqi,
    boroughPm25,
    worstBorough: BOROUGH_CENTERS[worst.borough as keyof typeof BOROUGH_CENTERS]?.label ?? 'The Bronx',
    overallAqi: worst.aqi,
    overallPm25: Math.round(worst.pm25),
  };

  setCache('aqi-summary', payload, TTL.AQI);
  logFetcher({ source: 'AQI', status: 'live', count: responses.length });
  return payload;
}