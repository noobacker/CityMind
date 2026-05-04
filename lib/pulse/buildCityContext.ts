import type { CityPulse, NeighborhoodPulse } from '@/lib/types';
import type { CityDef } from '@/lib/cities/types';
import { detectAnomaly, scoreNeighborhood, summarizeBoroughStress } from '@/lib/pulse/scoreNeighborhoods';
import { fetch311Complaints } from '@/lib/fetchers/fetch311';
import { fetchAQI } from '@/lib/fetchers/fetchAQI';
import { fetchMTAAlerts } from '@/lib/fetchers/fetchMTA';
import { fetchWeather } from '@/lib/fetchers/fetchWeather';
import { fetchEvents } from '@/lib/fetchers/fetchEvents';
import { TTL } from '@/lib/cache';
import { getCityById } from '@/lib/cities/registry';

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
  'Late-night Food Market',
  'Outdoor Cinema Screening',
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
  city: CityDef;
  complaintByNeighborhood: Record<string, { complaintCount: number; topComplaint: string; topIssues: string[] }>;
  boroughAqi: Record<string, number>;
  mtaSeverity: 'good' | 'minor' | 'major' | 'severe';
  weather: { precipitation: boolean; windSpeed: number };
  activeEvents: string[];
}): Record<string, NeighborhoodPulse> {

  const neighborhoods: Record<string, NeighborhoodPulse> = {};
  const transitAffectedDistricts = new Set(input.city.districts.slice(0, Math.min(3, input.city.districts.length)).map((d) => d.id));

  input.city.neighborhoods.forEach((seed) => {
    const complaint = input.complaintByNeighborhood[seed.name] ?? {
      complaintCount: 0,
      topComplaint: 'Noise - Residential',
      topIssues: ['Noise - Residential'],
    };
    const aqi = input.boroughAqi[seed.district] ?? 2;

    const mtaDisruptionNearby = input.mtaSeverity !== 'good' && transitAffectedDistricts.has(seed.district);
    const majorEventNearby = input.activeEvents.some((event) => event.toLowerCase().includes(seed.district.toLowerCase()));
    const stress = scoreNeighborhood({
      complaintCount: complaint.complaintCount,
      topComplaint: complaint.topComplaint,
      aqi,
      mtaDisruptionNearby,
      precipitation: input.weather.precipitation,
      windSpeed: input.weather.windSpeed,
      majorEventNearby,
    });

    const historyKey = `${input.city.id}:${seed.name}`;
    const historical = nextHistory(historyKey, stress);
    const anomaly = detectAnomaly(stress, historical.slice(0, -1));

    const hasSocialGem = Math.random() > 0.85;
    const socialVibe = hasSocialGem ? POSITIVE_VIBES[Math.floor(Math.random() * POSITIVE_VIBES.length)] : undefined;
    const socialVibrancy = hasSocialGem ? 60 + Math.floor(Math.random() * 40) : 10 + Math.floor(Math.random() * 20);

    neighborhoods[seed.name] = {
      stress: Math.max(1, Math.min(100, stress + (Math.floor(Math.random() * 5) - 2))),
      anomaly,
      complaintCount: complaint.complaintCount,
      topComplaint: complaint.topComplaint,
      topIssues: complaint.topIssues,
      name: seed.name,
      borough: seed.district,
      socialVibe,
      socialVibrancy,
      lat: seed.lat,
      lon: seed.lon,
    };
  });

  return neighborhoods;
}

function getCityNickname(city: CityDef): string {
  const name = city.name.toLowerCase();
  if (name.includes('new york')) return 'THE BIG APPLE';
  if (name.includes('london')) return 'THE SQUARE MILE';
  if (name.includes('tokyo')) return 'THE NEON HEART';
  if (name.includes('paris')) return 'CITY OF LIGHT';
  if (name.includes('mumbai')) return 'CITY OF DREAMS';
  if (name.includes('chandrapur')) return 'THE BLACK GOLD CITY';
  if (name.includes('wani')) return 'THE BLACK DIAMOND CITY';
  if (name.includes('bangalore')) return 'SILICON VALLEY OF INDIA';
  if (name.includes('san francisco')) return 'THE GOLDEN CITY';
  if (name.includes('dubai')) return 'CITY OF GOLD';
  return 'NEURAL NETWORK NODE';
}

async function buildCityPulse(city: CityDef): Promise<CityPulse> {
  const [complaintsResult, aqiResult, mtaResult, weatherResult, eventsResult] = await Promise.allSettled([
    fetch311Complaints(city),
    fetchAQI(city),
    fetchMTAAlerts(city),
    fetchWeather(city),
    fetchEvents(city),
  ]);

  const complaints = complaintsResult.status === 'fulfilled'
    ? complaintsResult.value
    : { byNeighborhood: Object.fromEntries(city.neighborhoods.map((n) => [n.name, { complaintCount: 0, topComplaint: 'Noise - Residential', topIssues: ['Noise - Residential'] }])), totalCount: 0 };

  const fallbackAqi = Object.fromEntries(city.districts.map((d) => [d.id, 2]));
  const fallbackPm25 = Object.fromEntries(city.districts.map((d) => [d.id, 8]));
  const aqi = aqiResult.status === 'fulfilled'
    ? aqiResult.value
    : { boroughAqi: fallbackAqi, boroughPm25: fallbackPm25, worstBorough: city.districts[0]?.label ?? 'Unknown', overallAqi: 2, overallPm25: 8 };

  const mta = mtaResult.status === 'fulfilled'
    ? mtaResult.value
    : { disruptions: ['Transit running on schedule'], affectedLines: [], severity: 'good' as const, label: 'Transit' };

  const weather = weatherResult.status === 'fulfilled'
    ? weatherResult.value
    : { temp: city.tempUnit === 'F' ? 60 : 16, condition: 'partly cloudy', precipitation: false, windSpeed: 10, unit: city.tempUnit };

  const events = eventsResult.status === 'fulfilled'
    ? eventsResult.value
    : { events: ['No major permitted events right now'] };

  const neighborhoods = buildNeighborhoods({
    city,
    complaintByNeighborhood: complaints.byNeighborhood,
    boroughAqi: aqi.boroughAqi,
    mtaSeverity: mta.severity,
    weather,
    activeEvents: events.events,
  });

  const boroughs: CityPulse['boroughs'] = {};
  for (const district of city.districts) {
    const summary = summarizeBoroughStress(neighborhoods, district.id);
    boroughs[district.id] = {
      ...summary,
      aqi: aqi.boroughAqi[district.id] ?? 2,
    };
  }

  const boroughLabels = Object.fromEntries(city.districts.map((d) => [d.id, d.label]));

  const overallStress = Math.round(
    Object.values(neighborhoods).reduce((sum, n) => sum + n.stress, 0) / Math.max(Object.keys(neighborhoods).length, 1),
  );

  const mood: CityPulse['mood'] = overallStress < 25 ? 'calm' : overallStress < 50 ? 'tense' : overallStress < 75 ? 'stressed' : 'overwhelmed';
  const moodEmoji = mood === 'calm' ? '🙂' : mood === 'tense' ? '😐' : mood === 'stressed' ? '😣' : '😵';

  const sortedDistricts = Object.entries(boroughs).sort((a, b) => b[1].stress - a[1].stress);
  const worstDistrictId = sortedDistricts[0]?.[0] ?? city.districts[0]?.id ?? '';
  const worstDistrictLabel = boroughLabels[worstDistrictId] ?? city.districts[0]?.label ?? 'Unknown';

  const socialGems = Object.entries(neighborhoods).filter(([, n]) => !!n.socialVibe);
  const topSocial = socialGems.sort((a, b) => (b[1].socialVibrancy || 0) - (a[1].socialVibrancy || 0))[0];

  return {
    cityId: city.id,
    cityName: city.name,
    nickname: getCityNickname(city),
    cityIdentity: {
      id: city.id,
      name: city.name,
      country: city.country,
      countryCode: city.countryCode,
      flag: city.flag,
      timezone: city.timezone,
      tempUnit: city.tempUnit,
      isCustom: city.isCustom,
    },
    timestamp: new Date().toISOString(),
    overallStress,
    mood,
    moodEmoji,
    neighborhoods,
    boroughs,
    boroughLabels,
    mta,
    airQuality: {
      aqi: aqi.overallAqi,
      worstBorough: aqi.worstBorough || worstDistrictLabel,
      pm25: aqi.overallPm25,
    },
    weather,
    activeEvents: events.events,
    topAlerts: Object.entries(neighborhoods)
      .sort((a, b) => b[1].stress - a[1].stress)
      .slice(0, 3)
      .map(([name, n]) => `${name} is at ${n.stress}/100 with ${n.topComplaint.toLowerCase()}`),
    socialMesh: topSocial ? {
      trendingVibe: topSocial[1].socialVibe!,
      hotspot: topSocial[0],
      vibrancyScore: topSocial[1].socialVibrancy || 0,
    } : undefined,
  };
}

export async function getCityPulse(city: CityDef): Promise<CityPulse> {
  const cacheKey = `citypulse:${city.id}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const pulse = await buildCityPulse(city);
  memoryCache.set(cacheKey, { data: pulse, expiresAt: Date.now() + TTL.CITY_PULSE });
  return pulse;
}

export async function getCityPulseById(cityId: string): Promise<CityPulse | null> {
  const city = getCityById(cityId);
  if (!city) return null;
  return getCityPulse(city);
}

export function buildCityContext(pulse: CityPulse): string {
  const topNeighborhoods = Object.entries(pulse.neighborhoods)
    .sort((a, b) => b[1].stress - a[1].stress)
    .slice(0, 5)
    .map(([name, n]) => `${name}(${n.stress}${n.anomaly ? '!' : ''})`)
    .join(', ');

  const tempUnit = pulse.weather.unit ?? 'F';

  return [
    `City:${pulse.cityName}`,
    `Timestamp:${pulse.timestamp}`,
    `Stress:${pulse.overallStress}/100 Mood:${pulse.mood}${pulse.moodEmoji}`,
    `Transit:${pulse.mta.severity} ${pulse.mta.affectedLines.join(',') || 'none'}`,
    `AQI:${pulse.airQuality.aqi}/5 Worst:${pulse.airQuality.worstBorough}`,
    `Weather:${pulse.weather.condition}, ${pulse.weather.temp}°${tempUnit}`,
    `Top neighborhoods:${topNeighborhoods}`,
    `Alerts:${pulse.topAlerts.join(' | ')}`,
    pulse.socialMesh ? `Social:${pulse.socialMesh.trendingVibe} in ${pulse.socialMesh.hotspot}(vibrancy:${pulse.socialMesh.vibrancyScore}%)` : '',
  ].join(' ');
}

export function clearCityPulseCache(cityId?: string): void {
  if (cityId) {
    memoryCache.delete(`citypulse:${cityId}`);
  } else {
    memoryCache.clear();
  }
}
