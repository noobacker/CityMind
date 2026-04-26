'use client';

import { useEffect, useState } from 'react';
import { CityAvatar } from '@/components/CityAvatar';
import { CityMap } from '@/components/CityMap';
import { Terminal } from '@/components/Terminal';
import { VitalsBar } from '@/components/VitalsBar';
import { NeuralPerspective } from '@/components/NeuralPerspective';
import type { CityPulse, ForecastPulse } from '@/lib/types';


type VitalsPayload = Pick<CityPulse, 'overallStress' | 'mood' | 'moodEmoji' | 'mta' | 'airQuality' | 'weather' | 'topAlerts'>;

const FALLBACK_PULSE: CityPulse = {
  timestamp: new Date().toISOString(),
  overallStress: 0,
  mood: 'calm',
  moodEmoji: '◌',
  neighborhoods: {},
  boroughs: {
    manhattan: { stress: 0, complaintCount: 0, aqi: 0, topIssue: 'Initializing...' },
    brooklyn: { stress: 0, complaintCount: 0, aqi: 0, topIssue: 'Initializing...' },
    bronx: { stress: 0, complaintCount: 0, aqi: 0, topIssue: 'Initializing...' },
    queens: { stress: 0, complaintCount: 0, aqi: 0, topIssue: 'Initializing...' },
    statenIsland: { stress: 0, complaintCount: 0, aqi: 0, topIssue: 'Initializing...' },
  },
  mta: {
    disruptions: [],
    affectedLines: [],
    severity: 'good',
  },
  airQuality: {
    aqi: 0,
    worstBorough: 'None',
    pm25: 0,
  },
  weather: {
    temp: 0,
    condition: 'syncing...',
    precipitation: false,
    windSpeed: 0,
  },
  activeEvents: ['Synchronizing neural grid...'],
  topAlerts: [],
};


export default function DashboardPage() {
  const [pulse, setPulse] = useState<CityPulse>(FALLBACK_PULSE);
  const [vitals, setVitals] = useState<VitalsPayload>({
    overallStress: FALLBACK_PULSE.overallStress,
    mood: FALLBACK_PULSE.mood,
    moodEmoji: FALLBACK_PULSE.moodEmoji,
    mta: FALLBACK_PULSE.mta,
    airQuality: FALLBACK_PULSE.airQuality,
    weather: FALLBACK_PULSE.weather,
    topAlerts: FALLBACK_PULSE.topAlerts,
  });
  const [highlightedNeighborhoods, setHighlightedNeighborhoods] = useState<string[]>([]);
  const [anomalies, setAnomalies] = useState<{ id: string; msg: string }[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showPerspective, setShowPerspective] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  const [forecastPulse, setForecastPulse] = useState<ForecastPulse | null>(null);
  const [showForecast, setShowForecast] = useState(false);



  useEffect(() => {
    let active = true;

    async function loadPulse() {
      if (isPaused) return;
      try {

        const response = await fetch('/api/pulse', { cache: 'no-store' });
        if (!response.ok || !active) return;
        const data = (await response.json()) as CityPulse;
        setPulse((current) => ({ ...current, ...data }));
        
        // Detect and trigger anomaly toasts
        const neighborhoodList = Object.entries(data.neighborhoods);
        const spike = neighborhoodList.find(([_, stats]) => stats.stress > 80);
        if (spike) {
          const id = Date.now().toString();
          setAnomalies(prev => [...prev, { id, msg: `ANOMALY DETECTED: ${spike[0]} is critically stressed.` }]);
          setTimeout(() => {
            setAnomalies(prev => prev.filter(a => a.id !== id));
          }, 6000);
        }
      } catch {
        // Keep fallback pulse
      }
    }

    async function loadVitals() {
      if (isPaused) return;
      try {

        const response = await fetch('/api/vitals', { cache: 'no-store' });
        if (!response.ok || !active) return;
        const data = (await response.json()) as VitalsPayload;
        setVitals(data);
      } catch {
        // Keep fallback vitals
      }
    }

    async function loadForecast() {
      try {
        const response = await fetch('/api/forecast', { cache: 'no-store' });
        if (!response.ok || !active) return;
        const data = (await response.json()) as ForecastPulse;
        setForecastPulse(data);
      } catch {
        // Forecast is optional — keep null
      }
    }

    void loadPulse();
    void loadVitals();
    void loadForecast();
    const interval = window.setInterval(() => void loadPulse(), 30000);
    const vitalsInterval = window.setInterval(() => void loadVitals(), 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearInterval(vitalsInterval);
    };
  }, []);

  return (
    <main className="appShell" data-theme={theme}>
      <VitalsBar 
        pulse={vitals} 
        theme={theme} 
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
        onOpenPerspective={() => setShowPerspective(true)}
      />
      
      <NeuralPerspective 
        pulse={pulse} 
        isOpen={showPerspective} 
        onClose={() => setShowPerspective(false)} 
      />


      
      <div className="toastContainer">
        {anomalies.map(a => (
          <div key={a.id} className="anomalyToast">
            <div className="toastSeverity" />
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--stress)', letterSpacing: '0.1em', fontWeight: 800 }}>PRIORITY_ALERT</div>
              <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>{a.msg}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="dashboardGrid">
        <div className="terminalCol">
          <Terminal
            pulse={pulse}
            highlightedNeighborhoods={highlightedNeighborhoods}
            onHighlightedNeighborhoodsChange={setHighlightedNeighborhoods}
          />
        </div>
        
        <div className="visualCol">
          <div className="cityAvatarStage" style={{ height: '240px', width: '100%', position: 'relative' }}>
            <CityAvatar pulse={pulse} theme={theme} onFocusNeighborhoodsChange={setHighlightedNeighborhoods} />
          </div>

          <CityMap
            pulse={pulse}
            theme={theme}
            highlightedNeighborhoods={highlightedNeighborhoods}
            onSelectNeighborhood={(name) => setHighlightedNeighborhoods([name])}
            forecastPulse={forecastPulse}
            showForecast={showForecast}
            onToggleForecast={() => setShowForecast((v) => !v)}
            onSandboxToggle={setIsPaused}
            onSandboxImpact={(msg) => {
              // We can show these impacts in the terminal or toast if needed
            }}
          />


        </div>

      </section>
    </main>
  );
}