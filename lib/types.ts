export type BoroughName = string;

export interface NeighborhoodPulse {
  name: string;
  borough: string;
  stress: number;
  anomaly: boolean;
  complaintCount: number;
  topComplaint: string;
  topIssues?: string[];
  socialVibe?: string;
  socialVibrancy?: number;
  lat: number;
  lon: number;
  forecastReason?: string;
}

export interface BoroughData {
  stress: number;
  complaintCount: number;
  aqi: number;
  topIssue: string;
}

export interface CityIdentity {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  timezone: string;
  tempUnit: 'F' | 'C';
  isCustom?: boolean;
}

export interface CityPulse {
  cityId: string;
  cityName: string;
  nickname?: string;
  cityIdentity?: CityIdentity;
  timestamp: string;
  overallStress: number;
  mood: string;
  moodEmoji: string;
  neighborhoods: Record<string, NeighborhoodPulse>;
  boroughs: Record<string, BoroughData>;
  boroughLabels: Record<string, string>;
  mta: {
    disruptions: string[];
    affectedLines: string[];
    severity: 'good' | 'minor' | 'major' | 'severe';
    label?: string;
  };
  airQuality: {
    aqi: number;
    worstBorough: string;
    pm25: number;
  };
  weather: {
    temp: number;
    condition: string;
    precipitation: boolean;
    windSpeed: number;
    unit?: 'F' | 'C';
  };
  activeEvents: string[];
  topAlerts: string[];
  socialMesh?: {
    trendingVibe: string;
    hotspot: string;
    vibrancyScore: number;
  };
}

export interface ForecastPulse extends CityPulse {
  forecastFactors: string[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponsePayload {
  response: string;
  mentionedNeighborhoods: string[];
  pulse: Pick<CityPulse, 'overallStress' | 'mood' | 'moodEmoji'>;
}
