import { NEIGHBORHOODS } from '@/lib/constants/neighborhoods';

export function extractMentionedNeighborhoods(text: string): string[] {
  const lowerText = text.toLowerCase();
  return NEIGHBORHOODS.filter((neighborhood) => lowerText.includes(neighborhood.name.toLowerCase())).map((neighborhood) => neighborhood.name);
}