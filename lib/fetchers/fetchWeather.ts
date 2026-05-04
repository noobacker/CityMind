import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';
import type { CityDef } from '@/lib/cities/types';

export interface WeatherPayload {
  temp: number;
  precipitation: boolean;
  windSpeed: number;
  condition: string;
  unit: 'F' | 'C';
}

function weatherCondition(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly cloudy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowing';
  return 'stormy';
}

export async function fetchWeather(city: CityDef): Promise<WeatherPayload> {
  const cacheKey = `weather:${city.id}`;
  const cached = getCache<WeatherPayload>(cacheKey);
  if (cached) {
    logFetcher({ source: 'weather', status: 'cache-hit', detail: city.id });
    return cached;
  }

  const tempUnit = city.tempUnit === 'F' ? 'fahrenheit' : 'celsius';
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=temperature_2m,precipitation,wind_speed_10m,weather_code&temperature_unit=${tempUnit}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      logFetcher({ source: 'weather', status: 'error', detail: `http_${response.status}_${city.id}` });
      throw new Error(`Weather fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      current?: {
        temperature_2m?: number;
        precipitation?: number;
        wind_speed_10m?: number;
        weather_code?: number;
      };
    };
    const current = data.current ?? {};

    const fallbackTemp = city.tempUnit === 'F' ? 60 : 16;
    const payload: WeatherPayload = {
      temp: Math.round(current.temperature_2m ?? fallbackTemp),
      precipitation: (current.precipitation ?? 0) > 0,
      windSpeed: Math.round(current.wind_speed_10m ?? 10),
      condition: weatherCondition(current.weather_code ?? 1),
      unit: city.tempUnit,
    };

    setCache(cacheKey, payload, TTL.WEATHER);
    logFetcher({ source: 'weather', status: 'live', detail: city.id });
    return payload;
  } catch (e) {
    const fallbackTemp = city.tempUnit === 'F' ? 60 : 16;
    return { temp: fallbackTemp, precipitation: false, windSpeed: 10, condition: 'partly cloudy', unit: city.tempUnit };
  }
}
