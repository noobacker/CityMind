import { describe, expect, it } from 'vitest';
import { extractMentionedNeighborhoods } from '@/lib/agent/extractMentions';
import type { CityPulse } from '@/lib/types';

const STUB_PULSE: CityPulse = {
  cityId: 'nyc',
  cityName: 'New York City',
  timestamp: '',
  overallStress: 0,
  mood: 'calm',
  moodEmoji: '🙂',
  neighborhoods: {
    Bushwick: { name: 'Bushwick', borough: 'brooklyn', stress: 30, anomaly: false, complaintCount: 0, topComplaint: '', lat: 0, lon: 0 },
    'Sunset Park': { name: 'Sunset Park', borough: 'brooklyn', stress: 30, anomaly: false, complaintCount: 0, topComplaint: '', lat: 0, lon: 0 },
  },
  boroughs: {},
  boroughLabels: {},
  mta: { disruptions: [], affectedLines: [], severity: 'good' },
  airQuality: { aqi: 0, worstBorough: '', pm25: 0 },
  weather: { temp: 0, condition: '', precipitation: false, windSpeed: 0 },
  activeEvents: [],
  topAlerts: [],
};

describe('extractMentionedNeighborhoods', () => {
  it('extracts known neighborhood mentions from assistant text', () => {
    const mentions = extractMentionedNeighborhoods('Bushwick is tense while Sunset Park is holding steady.', STUB_PULSE);
    expect(mentions).toContain('Bushwick');
    expect(mentions).toContain('Sunset Park');
  });
});
