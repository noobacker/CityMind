import { NextResponse } from 'next/server';
import { getCityPulse } from '@/lib/pulse/buildCityContext';
import { fetchForecastWeather } from '@/lib/fetchers/fetchForecastWeather';
import { fetchEvents } from '@/lib/fetchers/fetchEvents';
import { buildForecastPulse } from '@/lib/pulse/buildForecastPulse';

export async function GET() {
  const [currentPulseResult, forecastWeatherResult, eventsResult] = await Promise.allSettled([
    getCityPulse(),
    fetchForecastWeather(),
    fetchEvents(),
  ]);

  if (currentPulseResult.status === 'rejected') {
    return NextResponse.json({ error: 'Failed to build forecast' }, { status: 500 });
  }

  const forecastWeather =
    forecastWeatherResult.status === 'fulfilled'
      ? forecastWeatherResult.value
      : { temp: 72, condition: 'partly cloudy', precipitation: false, windSpeed: 10, heatwave: false };

  const events =
    eventsResult.status === 'fulfilled' ? eventsResult.value.events : [];

  const forecast = buildForecastPulse(currentPulseResult.value, forecastWeather, events);
  return NextResponse.json(forecast);
}
