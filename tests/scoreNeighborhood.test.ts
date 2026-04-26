import { describe, expect, it } from 'vitest';
import { scoreNeighborhood } from '@/lib/pulse/scoreNeighborhoods';

describe('scoreNeighborhood', () => {
  it('produces higher stress for severe conditions', () => {
    const calm = scoreNeighborhood({
      complaintCount: 5,
      topComplaint: 'Noise - Residential',
      aqi: 1,
      mtaDisruptionNearby: false,
      precipitation: false,
      windSpeed: 5,
      majorEventNearby: false,
    });

    const severe = scoreNeighborhood({
      complaintCount: 80,
      topComplaint: 'Water System',
      aqi: 5,
      mtaDisruptionNearby: true,
      precipitation: true,
      windSpeed: 25,
      majorEventNearby: true,
    });

    expect(severe).toBeGreaterThan(calm);
    expect(severe).toBeLessThanOrEqual(100);
  });
});