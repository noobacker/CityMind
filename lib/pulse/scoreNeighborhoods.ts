import type { NeighborhoodPulse } from '@/lib/types';

export interface NeighborhoodRawData {
  complaintCount: number;
  topComplaint: string;
  aqi: number;
  mtaDisruptionNearby: boolean;
  precipitation: boolean;
  windSpeed: number;
  majorEventNearby: boolean;
}

const SEVERITY_BONUS: Record<string, number> = {
  'Noise - Residential': 0,
  'HEAT/HOT WATER': 15,
  'Water System': 12,
  'Blocked Driveway': 2,
  'Illegal Parking': 2,
  'Street Light Condition': 8,
  'PAINT/PLASTER': 5,
  'Air Quality': 20,
  'Power Outage': 18,
  'Construction Noise': 6,
  'Public Safety': 15,
  'Sewer': 10,
};

export function scoreNeighborhood(data: NeighborhoodRawData): number {
  let score = Math.min((data.complaintCount / 60) * 40, 50);
  score += SEVERITY_BONUS[data.topComplaint] ?? 0;
  score += (data.aqi - 1) * 4;
  if (data.mtaDisruptionNearby) score += 12;
  if (data.precipitation) score += 5;
  if (data.windSpeed > 20) score += 5;
  if (data.majorEventNearby) score += 8;
  return Math.max(1, Math.min(Math.round(score), 100));
}

export function detectAnomaly(current: number, historical: number[]): boolean {
  if (historical.length === 0) return false;
  const mean = historical.reduce((sum, value) => sum + value, 0) / historical.length;
  const variance = historical.reduce((sum, value) => sum + (value - mean) ** 2, 0) / historical.length;
  const std = Math.sqrt(variance) || 1;
  return (current - mean) / std > 2;
}

export function summarizeBoroughStress(neighborhoods: Record<string, NeighborhoodPulse>, borough: string) {
  const entries = Object.entries(neighborhoods).filter(([, neighborhood]) => neighborhood.borough === borough);
  const complaintCount = entries.reduce((sum, [, neighborhood]) => sum + neighborhood.complaintCount, 0);
  const stress = Math.round(entries.reduce((sum, [, neighborhood]) => sum + neighborhood.stress, 0) / Math.max(entries.length, 1));
  const aqi = Math.min(5, Math.max(1, 1 + Math.round(stress / 25)));
  const topIssue = entries.sort((a, b) => b[1].stress - a[1].stress)[0]?.[1].topComplaint ?? 'Quiet';
  return { complaintCount, stress, aqi, topIssue };
}
