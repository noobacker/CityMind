import { describe, expect, it } from 'vitest';
import { getCityPulse } from '@/lib/pulse/buildCityContext';

describe('CityPulse payload', () => {
  it('contains expected top-level fields', async () => {
    const pulse = await getCityPulse();
    expect(typeof pulse.timestamp).toBe('string');
    expect(typeof pulse.overallStress).toBe('number');
    expect(typeof pulse.mta.severity).toBe('string');
    expect(typeof pulse.airQuality.aqi).toBe('number');
    expect(typeof pulse.weather.temp).toBe('number');
    expect(Array.isArray(pulse.topAlerts)).toBe(true);
  });
});