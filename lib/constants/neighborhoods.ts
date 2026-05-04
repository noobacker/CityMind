import { CITIES, DEFAULT_CITY_ID, getCityById } from '@/lib/cities/registry';
import type { CityDef } from '@/lib/cities/types';

export interface NeighborhoodSeed {
  name: string;
  borough: string;
  lat: number;
  lon: number;
}

export function getNeighborhoodSeeds(cityId: string): NeighborhoodSeed[] {
  const city = getCityById(cityId);
  if (!city) return [];
  return city.neighborhoods.map((n) => ({
    name: n.name,
    borough: n.district,
    lat: n.lat,
    lon: n.lon,
  }));
}

export function getBoroughLabels(cityId: string): Record<string, string> {
  const city = getCityById(cityId);
  if (!city) return {};
  return Object.fromEntries(city.districts.map((d) => [d.id, d.label]));
}

export function neighborhoodsForCity(city: CityDef): NeighborhoodSeed[] {
  return city.neighborhoods.map((n) => ({
    name: n.name,
    borough: n.district,
    lat: n.lat,
    lon: n.lon,
  }));
}

export function boroughLabelsForCity(city: CityDef): Record<string, string> {
  return Object.fromEntries(city.districts.map((d) => [d.id, d.label]));
}

export const NEIGHBORHOODS: NeighborhoodSeed[] = getNeighborhoodSeeds(DEFAULT_CITY_ID);
export const BOROUGH_LABELS: Record<string, string> = getBoroughLabels(DEFAULT_CITY_ID);
export const ALL_CITIES = CITIES;
