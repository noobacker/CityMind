import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';

export interface ForecastWeatherPayload {
  temp: number;
  condition: string;
  precipitation: boolean;
  windSpeed: number;
  heatwave: boolean;
}

function weatherCondition(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly cloudy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowing';
  return 'stormy';
}

export async function fetchForecastWeather(): Promise<ForecastWeatherPayload> {
  const cached = getCache<ForecastWeatherPayload>('weather-forecast-24h');
  if (cached) {
    logFetcher({ source: 'weather-forecast', status: 'cache-hit' });
    return cached;
  }

  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060' +
    '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m' +
    '&temperature_unit=fahrenheit&forecast_days=2&timezone=America%2FNew_York';

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    logFetcher({ source: 'weather-forecast', status: 'error', detail: `http_${response.status}` });
    throw new Error(`Forecast weather fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    hourly?: {
      time?: string[];
      temperature_2m?: number[];
      precipitation_probability?: number[];
      weather_code?: number[];
      wind_speed_10m?: number[];
    };
  };

  const hourly = data.hourly ?? {};
  const times = hourly.time ?? [];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Peak hours 10am–6pm tomorrow
  const peakIndices = times
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => {
      const hour = parseInt(t.slice(11, 13));
      return t.startsWith(tomorrowStr) && hour >= 10 && hour <= 18;
    })
    .map(({ i }) => i);

  if (peakIndices.length === 0) {
    logFetcher({ source: 'weather-forecast', status: 'fallback', detail: 'no_tomorrow_hours' });
    return { temp: 72, condition: 'partly cloudy', precipitation: false, windSpeed: 10, heatwave: false };
  }

  const temps = peakIndices.map((i) => hourly.temperature_2m?.[i] ?? 72);
  const precipProbs = peakIndices.map((i) => hourly.precipitation_probability?.[i] ?? 0);
  const codes = peakIndices.map((i) => hourly.weather_code?.[i] ?? 1);
  const winds = peakIndices.map((i) => hourly.wind_speed_10m?.[i] ?? 10);

  const peakTemp = Math.round(Math.max(...temps));
  const maxPrecipProb = Math.max(...precipProbs);
  const dominantCode = codes[Math.floor(codes.length / 2)] ?? 1;
  const avgWind = Math.round(winds.reduce((a, b) => a + b, 0) / winds.length);

  const payload: ForecastWeatherPayload = {
    temp: peakTemp,
    condition: weatherCondition(dominantCode),
    precipitation: maxPrecipProb > 40,
    windSpeed: avgWind,
    heatwave: peakTemp >= 90,
  };

  setCache('weather-forecast-24h', payload, TTL.WEATHER);
  logFetcher({ source: 'weather-forecast', status: 'live' });
  return payload;
}
