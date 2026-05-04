import { NextRequest, NextResponse } from 'next/server';
import { getCityPulse } from '@/lib/pulse/buildCityContext';
import { fetchForecastWeather } from '@/lib/fetchers/fetchForecastWeather';
import { fetchEvents } from '@/lib/fetchers/fetchEvents';
import { buildForecastPulse } from '@/lib/pulse/buildForecastPulse';
import { resolveCityFromSearchParams } from '@/lib/cities/resolveCity';

export async function GET(request: NextRequest) {
  const city = await resolveCityFromSearchParams(request.nextUrl.searchParams);

  const [currentPulseResult, forecastWeatherResult, eventsResult] = await Promise.allSettled([
    getCityPulse(city),
    fetchForecastWeather(city),
    fetchEvents(city),
  ]);

  if (currentPulseResult.status === 'rejected') {
    return NextResponse.json({ error: 'Failed to build forecast' }, { status: 500 });
  }

  const forecastWeather =
    forecastWeatherResult.status === 'fulfilled'
      ? forecastWeatherResult.value
      : { temp: city.tempUnit === 'F' ? 72 : 22, condition: 'partly cloudy', precipitation: false, windSpeed: 10, heatwave: false, unit: city.tempUnit };

  const events =
    eventsResult.status === 'fulfilled' ? eventsResult.value.events : [];

  const forecast = buildForecastPulse(currentPulseResult.value, forecastWeather, events);
  return NextResponse.json(forecast);
}
