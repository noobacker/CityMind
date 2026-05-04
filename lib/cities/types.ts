export interface DistrictDef {
  id: string;
  label: string;
}

export interface NeighborhoodDef {
  name: string;
  district: string;
  lat: number;
  lon: number;
}

export interface CityDef {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  lat: number;
  lon: number;
  timezone: string;
  zoom: number;
  tempUnit: 'F' | 'C';
  districts: DistrictDef[];
  neighborhoods: NeighborhoodDef[];
  civicFeed?: 'nyc311' | 'none';
  transitFeed?: 'mta' | 'none';
  eventsFeed?: 'nyc' | 'none';
  isCustom?: boolean;
}

export interface CityListEntry {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  lat: number;
  lon: number;
  districtCount: number;
  neighborhoodCount: number;
  isCustom?: boolean;
}
