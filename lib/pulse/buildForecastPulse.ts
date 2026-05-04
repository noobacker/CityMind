import type { CityPulse, NeighborhoodPulse } from '@/lib/types';
import type { ForecastWeatherPayload } from '@/lib/fetchers/fetchForecastWeather';
import { summarizeBoroughStress } from '@/lib/pulse/scoreNeighborhoods';

export interface ForecastPulse extends CityPulse {
  forecastFactors: string[];
}

const HEAT_SENSITIVE = new Set(['HEAT/HOT WATER', 'Air Quality', 'Water System', 'Power Outage']);

function projectStress(
  current: number,
  topComplaint: string,
  options: {
    heatwave: boolean;
    hot: boolean;
    precipitation: boolean;
    stormy: boolean;
    mtaNearby: boolean;
    majorEvent: boolean;
  },
): number {
  let bonus = 0;
  if (options.heatwave) {
    bonus += HEAT_SENSITIVE.has(topComplaint) ? 20 : 12;
  } else if (options.hot) {
    bonus += HEAT_SENSITIVE.has(topComplaint) ? 10 : 5;
  }
  if (options.stormy) bonus += 10;
  else if (options.precipitation) bonus += 5;
  if (options.mtaNearby) bonus += 12;
  if (options.majorEvent) bonus += 8;
  return Math.max(1, Math.min(100, current + bonus));
}

export function buildForecastPulse(
  currentPulse: CityPulse,
  forecastWeather: ForecastWeatherPayload,
  upcomingEvents: string[],
): ForecastPulse {
  const factors: string[] = [];
  const tempUnit = forecastWeather.unit ?? 'F';
  const hotThreshold = tempUnit === 'F' ? 80 : 27;
  if (forecastWeather.heatwave) factors.push(`HEATWAVE ${forecastWeather.temp}°${tempUnit}`);
  else if (forecastWeather.temp > hotThreshold) factors.push(`HOT ${forecastWeather.temp}°${tempUnit}`);
  if (forecastWeather.condition === 'stormy') factors.push('STORM WARNING');
  else if (forecastWeather.precipitation) factors.push('RAIN LIKELY');
  if (upcomingEvents.length > 0 && !upcomingEvents[0].toLowerCase().includes('no major')) {
    factors.push(`${upcomingEvents.length} PERMIT${upcomingEvents.length > 1 ? 'TED EVENTS' : 'TED EVENT'}`);
  }
  if (currentPulse.mta.severity !== 'good') factors.push('TRANSIT DISRUPTIONS');
  if (factors.length === 0) factors.push('STABLE CONDITIONS');

  const hot = forecastWeather.temp > hotThreshold && !forecastWeather.heatwave;
  const stormy = forecastWeather.condition === 'stormy';
  const districtIds = Object.keys(currentPulse.boroughs);
  const transitAffectedDistricts = new Set(districtIds.slice(0, Math.min(3, districtIds.length)));

  const forecastNeighborhoods: Record<string, NeighborhoodPulse> = {};
  for (const [name, neighborhood] of Object.entries(currentPulse.neighborhoods)) {
    const majorEvent = upcomingEvents.some(
      (e) => !e.toLowerCase().includes('no major') && e.toLowerCase().includes(neighborhood.borough.toLowerCase()),
    );
    const mtaNearby = currentPulse.mta.severity !== 'good' && transitAffectedDistricts.has(neighborhood.borough);

    let reason = 'SYSTEMIC_BASELINE';
    if (forecastWeather.heatwave) reason = 'HEATWAVE_ANOMALY';
    else if (hot) reason = 'THERMAL_SPIKE';
    else if (stormy) reason = 'STORM_VECTOR';
    else if (forecastWeather.precipitation) reason = 'PRECIP_SLOWNESS';
    else if (majorEvent) reason = 'CROWD_DENSITY';
    else if (mtaNearby) reason = 'TRANSIT_FRICTION';

    forecastNeighborhoods[name] = {
      ...neighborhood,
      forecastReason: reason,
      stress: projectStress(neighborhood.stress, neighborhood.topComplaint, {
        heatwave: forecastWeather.heatwave,
        hot,
        precipitation: forecastWeather.precipitation,
        stormy,
        mtaNearby,
        majorEvent,
      }),
    };
  }

  const forecastBoroughs: CityPulse['boroughs'] = {};
  for (const district of districtIds) {
    const summary = summarizeBoroughStress(forecastNeighborhoods, district);
    forecastBoroughs[district] = { ...currentPulse.boroughs[district], ...summary };
  }

  const neighborhoodValues = Object.values(forecastNeighborhoods);
  const forecastOverallStress = Math.round(
    neighborhoodValues.reduce((sum, n) => sum + n.stress, 0) / Math.max(neighborhoodValues.length, 1),
  );

  const mood: CityPulse['mood'] =
    forecastOverallStress < 25 ? 'calm' :
    forecastOverallStress < 50 ? 'tense' :
    forecastOverallStress < 75 ? 'stressed' : 'overwhelmed';

  const moodEmoji = mood === 'calm' ? '🙂' : mood === 'tense' ? '😐' : mood === 'stressed' ? '😣' : '😵';

  const forecastTopAlerts = Object.entries(forecastNeighborhoods)
    .sort((a, b) => b[1].stress - a[1].stress)
    .slice(0, 3)
    .map(([name, n]) => `${name} projected at ${n.stress}/100 with ${n.topComplaint.toLowerCase()}`);

  const forecastTimestamp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    ...currentPulse,
    timestamp: forecastTimestamp,
    neighborhoods: forecastNeighborhoods,
    boroughs: forecastBoroughs,
    overallStress: forecastOverallStress,
    mood,
    moodEmoji,
    weather: {
      temp: forecastWeather.temp,
      condition: forecastWeather.condition,
      precipitation: forecastWeather.precipitation,
      windSpeed: forecastWeather.windSpeed,
      unit: forecastWeather.unit,
    },
    activeEvents: upcomingEvents,
    topAlerts: forecastTopAlerts,
    forecastFactors: factors,
  };
}
