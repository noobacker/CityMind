import { NextResponse } from 'next/server';
import { CITIES } from '@/lib/cities/registry';
import type { CityListEntry } from '@/lib/cities/types';

export async function GET() {
  const list: CityListEntry[] = CITIES.map((city) => ({
    id: city.id,
    name: city.name,
    country: city.country,
    countryCode: city.countryCode,
    flag: city.flag,
    lat: city.lat,
    lon: city.lon,
    districtCount: city.districts.length,
    neighborhoodCount: city.neighborhoods.length,
  }));
  return NextResponse.json({ cities: list });
}
