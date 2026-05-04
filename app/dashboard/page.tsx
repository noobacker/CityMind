'use client';

import { useEffect, useState } from 'react';
import { CityAvatar } from '@/components/CityAvatar';
import { CityMap } from '@/components/CityMap';
import { Terminal } from '@/components/Terminal';
import { VitalsBar } from '@/components/VitalsBar';
import { NeuralPerspective } from '@/components/NeuralPerspective';
import { AnomalyCenter } from '@/components/AnomalyCenter';
import { useCity } from '@/components/CityProvider';
import type { CityPulse, ForecastPulse } from '@/lib/types';

type VitalsPayload = Pick<CityPulse, 'overallStress' | 'mood' | 'moodEmoji' | 'mta' | 'airQuality' | 'weather' | 'topAlerts'> & {
  cityName?: string;
  cityIdentity?: CityPulse['cityIdentity'];
};

function buildFallbackPulse(cityName: string, cityId: string, lat?: number, lon?: number): CityPulse {
  return {
    cityId,
    cityName,
    cityIdentity: lat && lon ? { id: cityId, name: cityName, lat, lon, country: '', countryCode: '', flag: '🌍' } : undefined,
    timestamp: new Date().toISOString(),
    overallStress: 0,
    mood: 'calm',
    moodEmoji: '◌',
    neighborhoods: {},
    boroughs: {},
    boroughLabels: {},
    mta: { disruptions: [], affectedLines: [], severity: 'good', label: 'Transit' },
    airQuality: { aqi: 0, worstBorough: 'None', pm25: 0 },
    weather: { temp: 0, condition: 'syncing...', precipitation: false, windSpeed: 0, unit: 'F' },
    activeEvents: ['Synchronizing neural grid...'],
    topAlerts: [],
  };
}


export default function DashboardPage() {
  const { city, apiQuery, isReady } = useCity();
  const [pulse, setPulse] = useState<CityPulse>(() => buildFallbackPulse(city.name, city.id, city.lat, city.lon));
  const [vitals, setVitals] = useState<VitalsPayload>(() => {
    const fallback = buildFallbackPulse(city.name, city.id, city.lat, city.lon);

    return {
      overallStress: fallback.overallStress,
      mood: fallback.mood,
      moodEmoji: fallback.moodEmoji,
      mta: fallback.mta,
      airQuality: fallback.airQuality,
      weather: fallback.weather,
      topAlerts: fallback.topAlerts,
      cityName: fallback.cityName,
    };
  });
  const [highlightedNeighborhoods, setHighlightedNeighborhoods] = useState<string[]>([]);
  const [anomalies, setAnomalies] = useState<{ id: string; msg: string }[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showPerspective, setShowPerspective] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [forecastPulse, setForecastPulse] = useState<ForecastPulse | null>(null);
  const [showForecast, setShowForecast] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setHighlightedNeighborhoods([]);
    setForecastPulse(null);
    setShowForecast(false);
    setPulse(buildFallbackPulse(city.name, city.id, city.lat, city.lon));
  }, [city.id, city.name, city.lat, city.lon]);


  useEffect(() => {
    if (!isReady) return;
    let active = true;

    async function loadPulse() {
      if (isPaused) return;
      try {
        const response = await fetch(`/api/pulse?${apiQuery}`, { cache: 'no-store' });
        if (!response.ok || !active) return;
        const data = (await response.json()) as CityPulse;
        setPulse((current) => ({ ...current, ...data }));

        const neighborhoodList = Object.entries(data.neighborhoods);
        const spike = neighborhoodList.find(([, stats]) => stats.stress > 80);
        if (spike) {
          const id = Date.now().toString();
          setAnomalies((prev) => {
            // Only add if not already there recently to avoid spam
            if (prev.some(a => a.msg.includes(spike[0]))) return prev;
            return [{ id, msg: `ANOMALY DETECTED: ${spike[0]} is critically stressed.` }, ...prev].slice(0, 15);
          });
        }
      } catch {
        // keep fallback
      }
    }

    async function loadVitals() {
      if (isPaused) return;
      try {
        const response = await fetch(`/api/vitals?${apiQuery}`, { cache: 'no-store' });
        if (!response.ok || !active) return;
        const data = (await response.json()) as VitalsPayload;
        setVitals(data);
      } catch {
        // keep fallback
      }
    }

    async function loadForecast() {
      try {
        const response = await fetch(`/api/forecast?${apiQuery}`, { cache: 'no-store' });
        if (!response.ok || !active) return;
        const data = (await response.json()) as ForecastPulse;
        setForecastPulse(data);
      } catch {
        // optional
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
  }, [apiQuery, isReady, isPaused]);

  return (
    <main className="appShell" data-theme={theme}>
      <VitalsBar
        pulse={vitals}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenPerspective={() => setShowPerspective(true)}
      />

      <NeuralPerspective pulse={pulse} isOpen={showPerspective} onClose={() => setShowPerspective(false)} />

      <AnomalyCenter 
        anomalies={anomalies} 
        onClear={() => setAnomalies([])} 
      />

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
            onSandboxImpact={() => {}}
          />
        </div>
      </section>
    </main>
  );
}
