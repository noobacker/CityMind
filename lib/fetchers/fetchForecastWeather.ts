import { getCache, setCache, TTL } from '@/lib/cache';
import { logFetcher } from '@/lib/observability';
import type { CityDef } from '@/lib/cities/types';

export interface ForecastWeatherPayload {
  temp: number;
  condition: string;
  precipitation: boolean;
  windSpeed: number;
  heatwave: boolean;
  unit: 'F' | 'C';
}

function weatherCondition(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly cloudy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowing';
  return 'stormy';
}

export async function fetchForecastWeather(city: CityDef): Promise<ForecastWeatherPayload> {
  const cacheKey = `weather-forecast-24h:${city.id}`;
  const cached = getCache<ForecastWeatherPayload>(cacheKey);
  if (cached) {
    logFetcher({ source: 'weather-forecast', status: 'cache-hit', detail: city.id });
    return cached;
  }

  const tempUnit = city.tempUnit === 'F' ? 'fahrenheit' : 'celsius';
  const heatwaveThreshold = city.tempUnit === 'F' ? 90 : 32;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
    '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m' +
    `&temperature_unit=${tempUnit}&forecast_days=2&timezone=${encodeURIComponent(city.timezone)}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      logFetcher({ source: 'weather-forecast', status: 'error', detail: `http_${response.status}_${city.id}` });
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

    const peakIndices = times
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => {
        const hour = parseInt(t.slice(11, 13));
        return t.startsWith(tomorrowStr) && hour >= 10 && hour <= 18;
      })
      .map(({ i }) => i);

    if (peakIndices.length === 0) {
      logFetcher({ source: 'weather-forecast', status: 'fallback', detail: 'no_tomorrow_hours' });
      const fallbackTemp = city.tempUnit === 'F' ? 72 : 22;
      return { temp: fallbackTemp, condition: 'partly cloudy', precipitation: false, windSpeed: 10, heatwave: false, unit: city.tempUnit };
    }

    const fallbackTemp = city.tempUnit === 'F' ? 72 : 22;
    const temps = peakIndices.map((i) => hourly.temperature_2m?.[i] ?? fallbackTemp);
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
      heatwave: peakTemp >= heatwaveThreshold,
      unit: city.tempUnit,
    };

    setCache(cacheKey, payload, TTL.WEATHER);
    logFetcher({ source: 'weather-forecast', status: 'live', detail: city.id });
    return payload;
  } catch (e) {
    const fallbackTemp = city.tempUnit === 'F' ? 72 : 22;
    return { temp: fallbackTemp, condition: 'partly cloudy', precipitation: false, windSpeed: 10, heatwave: false, unit: city.tempUnit };
  }
}
