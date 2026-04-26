import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';

export interface WeatherPayload {
  temp: number;
  precipitation: boolean;
  windSpeed: number;
  condition: string;
}

function weatherCondition(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly cloudy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowing';
  return 'stormy';
}

export async function fetchWeather(): Promise<WeatherPayload> {
  const cached = getCache<WeatherPayload>('weather-summary');
  if (cached) {
    logFetcher({ source: 'weather', status: 'cache-hit' });
    return cached;
  }

  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060' +
    '&current=temperature_2m,precipitation,wind_speed_10m,weather_code&temperature_unit=fahrenheit';

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    logFetcher({ source: 'weather', status: 'error', detail: `http_${response.status}` });
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

  const payload: WeatherPayload = {
    temp: Math.round(current.temperature_2m ?? 60),
    precipitation: (current.precipitation ?? 0) > 0,
    windSpeed: Math.round(current.wind_speed_10m ?? 10),
    condition: weatherCondition(current.weather_code ?? 1),
  };

  setCache('weather-summary', payload, TTL.WEATHER);
  logFetcher({ source: 'weather', status: 'live' });
  return payload;
}