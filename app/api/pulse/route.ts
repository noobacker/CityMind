import { NextResponse } from 'next/server';
import { getCityPulse } from '@/lib/pulse/buildCityContext';

export async function GET() {
  const pulse = await getCityPulse();
  return NextResponse.json({
    timestamp: pulse.timestamp,
    neighborhoods: pulse.neighborhoods,
    boroughs: pulse.boroughs,
    overallStress: pulse.overallStress,
    mood: pulse.mood,
    moodEmoji: pulse.moodEmoji,
    mta: pulse.mta,
    airQuality: pulse.airQuality,
    weather: pulse.weather,
    activeEvents: pulse.activeEvents,
    topAlerts: pulse.topAlerts,
  });
}