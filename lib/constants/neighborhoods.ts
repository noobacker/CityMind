import type { BoroughName } from '@/lib/types';

export interface NeighborhoodSeed {
  name: string;
  borough: BoroughName;
  lat: number;
  lon: number;
}

export const NEIGHBORHOODS: NeighborhoodSeed[] = [
  // Manhattan (10 nodes)
  { name: 'Harlem', borough: 'manhattan', lat: 40.8116, lon: -73.9465 },
  { name: 'Midtown', borough: 'manhattan', lat: 40.7549, lon: -73.984 },
  { name: 'Lower East Side', borough: 'manhattan', lat: 40.715, lon: -73.9843 },
  { name: 'Upper West Side', borough: 'manhattan', lat: 40.787, lon: -73.9754 },
  { name: 'Chelsea', borough: 'manhattan', lat: 40.7465, lon: -74.0014 },
  { name: 'Financial District', borough: 'manhattan', lat: 40.7075, lon: -74.0113 },
  { name: 'Inwood', borough: 'manhattan', lat: 40.8677, lon: -73.9212 },
  { name: 'Hell\'s Kitchen', borough: 'manhattan', lat: 40.7638, lon: -73.9918 },
  { name: 'Greenwich Village', borough: 'manhattan', lat: 40.7335, lon: -74.003 },
  { name: 'Morningside Heights', borough: 'manhattan', lat: 40.809, lon: -73.9627 },
  
  // Brooklyn (12 nodes)
  { name: 'Bushwick', borough: 'brooklyn', lat: 40.6944, lon: -73.9212 },
  { name: 'Williamsburg', borough: 'brooklyn', lat: 40.7081, lon: -73.9571 },
  { name: 'Crown Heights', borough: 'brooklyn', lat: 40.6681, lon: -73.9442 },
  { name: 'Sunset Park', borough: 'brooklyn', lat: 40.6455, lon: -74.0124 },
  { name: 'Bay Ridge', borough: 'brooklyn', lat: 40.6262, lon: -74.0303 },
  { name: 'Bensonhurst', borough: 'brooklyn', lat: 40.6139, lon: -73.9922 },
  { name: 'Flatbush', borough: 'brooklyn', lat: 40.6402, lon: -73.9554 },
  { name: 'Park Slope', borough: 'brooklyn', lat: 40.6666, lon: -73.9823 },
  { name: 'DUMBO', borough: 'brooklyn', lat: 40.7033, lon: -73.9889 },
  { name: 'Canarsie', borough: 'brooklyn', lat: 40.6437, lon: -73.9011 },
  { name: 'Bed-Stuy', borough: 'brooklyn', lat: 40.6872, lon: -73.9418 },
  { name: 'Gravesend', borough: 'brooklyn', lat: 40.5924, lon: -73.9742 },
  
  // Bronx (9 nodes)
  { name: 'Mott Haven', borough: 'bronx', lat: 40.8095, lon: -73.9224 },
  { name: 'Fordham', borough: 'bronx', lat: 40.8615, lon: -73.8987 },
  { name: 'Riverdale', borough: 'bronx', lat: 40.8908, lon: -73.9125 },
  { name: 'Pelham Bay', borough: 'bronx', lat: 40.8497, lon: -73.8331 },
  { name: 'Soundview', borough: 'bronx', lat: 40.825, lon: -73.87 },
  { name: 'Kingsbridge', borough: 'bronx', lat: 40.8732, lon: -73.9059 },
  { name: 'Parkchester', borough: 'bronx', lat: 40.8358, lon: -73.8614 },
  { name: 'Hunts Point', borough: 'bronx', lat: 40.8169, lon: -73.8821 },
  { name: 'Woodlawn', borough: 'bronx', lat: 40.897, lon: -73.867 },
  
  // Queens (10 nodes)
  { name: 'Astoria', borough: 'queens', lat: 40.7644, lon: -73.9235 },
  { name: 'Jackson Heights', borough: 'queens', lat: 40.7557, lon: -73.8831 },
  { name: 'Flushing', borough: 'queens', lat: 40.7675, lon: -73.8331 },
  { name: 'Long Island City', borough: 'queens', lat: 40.7447, lon: -73.9485 },
  { name: 'Jamaica', borough: 'queens', lat: 40.7027, lon: -73.7891 },
  { name: 'Bayside', borough: 'queens', lat: 40.7684, lon: -73.7763 },
  { name: 'Rockaway Park', borough: 'queens', lat: 40.58, lon: -73.84 },
  { name: 'Forest Hills', borough: 'queens', lat: 40.7181, lon: -73.8448 },
  { name: 'Elmhurst', borough: 'queens', lat: 40.7381, lon: -73.8795 },
  { name: 'Sunnyside', borough: 'queens', lat: 40.7431, lon: -73.9224 },
  
  // Staten Island (5 nodes)
  { name: 'St. George', borough: 'statenIsland', lat: 40.6437, lon: -74.0736 },
  { name: 'New Dorp', borough: 'statenIsland', lat: 40.5735, lon: -74.113 },
  { name: 'Tottenville', borough: 'statenIsland', lat: 40.51, lon: -74.24 },
  { name: 'Great Kills', borough: 'statenIsland', lat: 40.5488, lon: -74.145 },
  { name: 'Port Richmond', borough: 'statenIsland', lat: 40.635, lon: -74.125 },
];



export const BOROUGH_LABELS: Record<BoroughName, string> = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  bronx: 'The Bronx',
  queens: 'Queens',
  statenIsland: 'Staten Island',
};