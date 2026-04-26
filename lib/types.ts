export type BoroughName = 'manhattan' | 'brooklyn' | 'bronx' | 'queens' | 'statenIsland';

export interface NeighborhoodPulse {
  stress: number;
  anomaly: boolean;
  complaintCount: number;
  topComplaint: string;
  topIssues: string[];
  name: string;
  borough: BoroughName;
  stress: number;
  complaintCount: number;
  topComplaint: string;
  topIssues?: string[];
  anomaly: boolean;
  socialVibe?: string;
  socialVibrancy?: number; // 0-100
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

export interface CityPulse {
  timestamp: string;
  overallStress: number;
  mood: string;
  moodEmoji: string;
  neighborhoods: Record<string, NeighborhoodPulse>;
  boroughs: Record<BoroughName, {
    stress: number;
    complaintCount: number;
    aqi: number;
    topIssue: string;
  }>;
  mta: {
    disruptions: string[];
    affectedLines: string[];
    severity: 'good' | 'minor' | 'major' | 'severe';
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