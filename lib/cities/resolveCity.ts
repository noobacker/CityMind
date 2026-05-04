import { getCityById, DEFAULT_CITY_ID } from './registry';
import { discoverCity } from './discoverCity';
import type { CityDef } from './types';

export interface CityRequestParams {
  id?: string | null;
  lat?: string | null;
  lon?: string | null;
  name?: string | null;
  country?: string | null;
  countryCode?: string | null;
}

export async function resolveCity(params: CityRequestParams): Promise<CityDef> {
  const id = (params.id || '').trim();

  if (id && !id.startsWith('custom_')) {
    const city = getCityById(id);
    if (city) return city;
  }

  const lat = parseFloat(params.lat || '');
  const lon = parseFloat(params.lon || '');
  const name = (params.name || '').trim();

  if (Number.isFinite(lat) && Number.isFinite(lon) && name) {
    return discoverCity({
      name,
      lat,
      lon,
      country: (params.country || '').trim() || 'Unknown',
      countryCode: (params.countryCode || '').trim() || 'XX',
    });
  }

  return getCityById(DEFAULT_CITY_ID)!;
}

export function resolveCityFromSearchParams(searchParams: URLSearchParams): Promise<CityDef> {
  return resolveCity({
    id: searchParams.get('city'),
    lat: searchParams.get('lat'),
    lon: searchParams.get('lon'),
    name: searchParams.get('name'),
    country: searchParams.get('country'),
    countryCode: searchParams.get('countryCode'),
  });
}
