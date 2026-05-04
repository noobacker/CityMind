import { describe, expect, it } from 'vitest';
import { getCityPulse } from '@/lib/pulse/buildCityContext';
import { getCityById } from '@/lib/cities/registry';

describe('CityPulse payload', () => {
  it('contains expected top-level fields', async () => {
    const nyc = getCityById('nyc')!;
    const pulse = await getCityPulse(nyc);
    expect(typeof pulse.timestamp).toBe('string');
    expect(typeof pulse.overallStress).toBe('number');
    expect(typeof pulse.mta.severity).toBe('string');
    expect(typeof pulse.airQuality.aqi).toBe('number');
    expect(typeof pulse.weather.temp).toBe('number');
    expect(Array.isArray(pulse.topAlerts)).toBe(true);
    expect(pulse.cityId).toBe('nyc');
    expect(pulse.cityName).toBe('New York City');
  });
});
