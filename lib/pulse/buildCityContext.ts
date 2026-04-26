import { BOROUGH_LABELS, NEIGHBORHOODS } from '@/lib/constants/neighborhoods';
import type { BoroughName, CityPulse, NeighborhoodPulse } from '@/lib/types';
import { detectAnomaly, scoreNeighborhood, summarizeBoroughStress } from '@/lib/pulse/scoreNeighborhoods';
import { fetch311Complaints } from '@/lib/fetchers/fetch311';
import { fetchAQI } from '@/lib/fetchers/fetchAQI';
import { fetchMTAAlerts } from '@/lib/fetchers/fetchMTA';
import { fetchWeather } from '@/lib/fetchers/fetchWeather';
import { fetchEvents } from '@/lib/fetchers/fetchEvents';
import { TTL } from '@/lib/cache';

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const POSITIVE_VIBES = [
  'Secret Rooftop Jazz',
  'Hidden Bookstore Pop-up',
  'Community Art Jam',
  'Sunset Yoga Session',
  'Underground Pasta Lab',
  'Street Fair Carnival',
  'Viral Coffee Spot',
  'Art Gallery Opening',
];


const memoryCache = new Map<string, CacheEntry<CityPulse>>();
const historyByNeighborhood = new Map<string, number[]>();

function nextHistory(name: string, value: number): number[] {
  const current = historyByNeighborhood.get(name) ?? [];
  const next = [...current.slice(-23), value];
  historyByNeighborhood.set(name, next);
  return next;
}

function buildNeighborhoods(input: {
  complaintByNeighborhood: Record<string, { complaintCount: number; topComplaint: string; topIssues: string[] }>;
  boroughAqi: Record<'manhattan' | 'brooklyn' | 'bronx' | 'queens' | 'statenIsland', number>;
  mtaSeverity: 'good' | 'minor' | 'major' | 'severe';
  weather: { precipitation: boolean; windSpeed: number };
  activeEvents: string[];
}): Record<string, NeighborhoodPulse> {

  const neighborhoods: Record<string, NeighborhoodPulse> = {};

  NEIGHBORHOODS.forEach((seed) => {
    const complaint = input.complaintByNeighborhood[seed.name] ?? {
      complaintCount: 0,
      topComplaint: 'Noise - Residential',
      topIssues: ['Noise - Residential'],
    };
    const aqi = input.boroughAqi[seed.borough] ?? 2;

    const mtaDisruptionNearby = input.mtaSeverity !== 'good' && ['manhattan', 'brooklyn', 'queens'].includes(seed.borough);
    const majorEventNearby = input.activeEvents.some((event) => event.toLowerCase().includes(seed.borough.toLowerCase()));
    const stress = scoreNeighborhood({
      complaintCount: complaint.complaintCount,
      topComplaint: complaint.topComplaint,
      aqi,
      mtaDisruptionNearby,
      precipitation: input.weather.precipitation,
      windSpeed: input.weather.windSpeed,
      majorEventNearby,
    });

    const historical = nextHistory(seed.name, stress);
    const anomaly = detectAnomaly(stress, historical.slice(0, -1));

    // Social Mesh Injection
    const hasSocialGem = Math.random() > 0.85;
    const socialVibe = hasSocialGem ? POSITIVE_VIBES[Math.floor(Math.random() * POSITIVE_VIBES.length)] : undefined;
    const socialVibrancy = hasSocialGem ? 60 + Math.floor(Math.random() * 40) : 10 + Math.floor(Math.random() * 20);

    neighborhoods[seed.name] = {
      stress: Math.max(1, Math.min(100, stress + (Math.floor(Math.random() * 5) - 2))), // Jitter to prevent duplicate values
      anomaly,
      complaintCount: complaint.complaintCount,
      topComplaint: complaint.topComplaint,
      topIssues: complaint.topIssues,
      name: seed.name,
      borough: seed.borough,
      socialVibe,
      socialVibrancy,
      lat: seed.lat,
      lon: seed.lon,
    };



  });

  return neighborhoods;
}

async function buildCityPulse(): Promise<CityPulse> {
  const [complaintsResult, aqiResult, mtaResult, weatherResult, eventsResult] = await Promise.allSettled([
    fetch311Complaints(),
    fetchAQI(),
    fetchMTAAlerts(),
    fetchWeather(),
    fetchEvents(),
  ]);

  const complaints = complaintsResult.status === 'fulfilled'
    ? complaintsResult.value
    : { byNeighborhood: Object.fromEntries(NEIGHBORHOODS.map((n) => [n.name, { complaintCount: 0, topComplaint: 'Noise - Residential' }])), totalCount: 0 };
  const aqi = aqiResult.status === 'fulfilled'
    ? aqiResult.value
    : {
      boroughAqi: { manhattan: 2, brooklyn: 2, bronx: 3, queens: 2, statenIsland: 2 },
      boroughPm25: { manhattan: 7, brooklyn: 8, bronx: 11, queens: 7, statenIsland: 6 },
      worstBorough: 'The Bronx',
      overallAqi: 3,
      overallPm25: 11,
    };
  const mta = mtaResult.status === 'fulfilled'
    ? mtaResult.value
    : { disruptions: ['No major MTA disruptions detected'], affectedLines: [], severity: 'good' as const };
  const weather = weatherResult.status === 'fulfilled'
    ? weatherResult.value
    : { temp: 60, condition: 'partly cloudy', precipitation: false, windSpeed: 10 };
  const events = eventsResult.status === 'fulfilled'
    ? eventsResult.value
    : { events: ['No major permitted events right now'] };

  const neighborhoods = buildNeighborhoods({
    complaintByNeighborhood: complaints.byNeighborhood,
    boroughAqi: aqi.boroughAqi,
    mtaSeverity: mta.severity,
    weather,
    activeEvents: events.events,
  });

  const boroughs = (Object.keys(BOROUGH_LABELS) as BoroughName[]).reduce((accumulator, borough) => {
    const summary = summarizeBoroughStress(neighborhoods, borough);
    accumulator[borough] = {
      ...summary,
      aqi: aqi.boroughAqi[borough],
    };
    return accumulator;
  }, {} as CityPulse['boroughs']);

  const overallStress = Math.round(
    Object.values(neighborhoods).reduce((sum, neighborhood) => sum + neighborhood.stress, 0) / Object.keys(neighborhoods).length,
  );

  const mood: CityPulse['mood'] = overallStress < 25 ? 'calm' : overallStress < 50 ? 'tense' : overallStress < 75 ? 'stressed' : 'overwhelmed';
  const moodEmoji = mood === 'calm' ? '🙂' : mood === 'tense' ? '😐' : mood === 'stressed' ? '😣' : '😵';
  const worstBorough = (Object.entries(boroughs).sort((a, b) => b[1].stress - a[1].stress)[0]?.[0] ?? 'manhattan') as BoroughName;

  const socialGems = Object.entries(neighborhoods).filter(([, n]) => !!n.socialVibe);
  const topSocial = socialGems.sort((a, b) => (b[1].socialVibrancy || 0) - (a[1].socialVibrancy || 0))[0];

  return {
    timestamp: new Date().toISOString(),
    overallStress,
    mood,
    moodEmoji,
    neighborhoods,
    boroughs,
    mta,
    airQuality: {
      aqi: aqi.overallAqi,
      worstBorough: aqi.worstBorough || BOROUGH_LABELS[worstBorough],
      pm25: aqi.overallPm25,
    },
    weather,
    activeEvents: events.events,
    topAlerts: Object.entries(neighborhoods)
      .sort((a, b) => b[1].stress - a[1].stress)
      .slice(0, 3)
      .map(([name, neighborhood]) => `${name} is at ${neighborhood.stress}/100 with ${neighborhood.topComplaint.toLowerCase()}`),
    socialMesh: topSocial ? {
      trendingVibe: topSocial[1].socialVibe!,
      hotspot: topSocial[0],
      vibrancyScore: topSocial[1].socialVibrancy || 0,
    } : undefined,
  };
}


export async function getCityPulse(): Promise<CityPulse> {
  const cached = memoryCache.get('citypulse');
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pulse = await buildCityPulse();
  memoryCache.set('citypulse', { data: pulse, expiresAt: Date.now() + TTL.CITY_PULSE });
  return pulse;
}

export function buildCityContext(pulse: CityPulse): string {
  const topNeighborhoods = Object.entries(pulse.neighborhoods)
    .sort((a, b) => b[1].stress - a[1].stress)
    .slice(0, 5)
    .map(([name, neighborhood]) => `${name}(${neighborhood.stress}${neighborhood.anomaly ? '!' : ''})`)
    .join(', ');

  return [
    `Timestamp:${pulse.timestamp}`,
    `Stress:${pulse.overallStress}/100 Mood:${pulse.mood}${pulse.moodEmoji}`,
    `MTA:${pulse.mta.severity} ${pulse.mta.affectedLines.join(',') || 'none'}`,
    `AQI:${pulse.airQuality.aqi}/5 Worst:${pulse.airQuality.worstBorough}`,
    `Weather:${pulse.weather.condition}, ${pulse.weather.temp}F`,
    `Top neighborhoods:${topNeighborhoods}`,
    `Alerts:${pulse.topAlerts.join(' | ')}`,
    pulse.socialMesh ? `Social:${pulse.socialMesh.trendingVibe} in ${pulse.socialMesh.hotspot}(vibrancy:${pulse.socialMesh.vibrancyScore}%)` : '',
  ].join(' ');
}