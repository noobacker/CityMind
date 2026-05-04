import type { CityPulse } from '@/lib/types';

export function extractMentionedNeighborhoods(text: string, pulse: CityPulse): string[] {
  const lowerText = text.toLowerCase();
  return Object.keys(pulse.neighborhoods).filter((name) => lowerText.includes(name.toLowerCase()));
}
