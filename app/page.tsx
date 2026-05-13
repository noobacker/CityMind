"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NeuralEdgeMap } from "@/components/NeuralEdgeMap";
import { NeuralCursor } from "@/components/NeuralCursor";
import { CitySelector } from "@/components/CitySelector";
import { useCity } from "@/components/CityProvider";

type LiveVitals = {
  overallStress: number;
  mood: string;
  moodEmoji: string;
  weather: { temp: number; unit?: 'F' | 'C' };
  cityName?: string;
  nickname?: string;
};

export default function LandingPage() {
  const { city, apiQuery, isReady } = useCity();
  const [pulse, setPulse] = useState<any>(null);
  const [liveVitals, setLiveVitals] = useState<LiveVitals | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isLocating, setIsLocating] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // The CityProvider expects a 'city' param starting with 'custom_' to trigger the custom logic
        window.location.href = `/dashboard?city=custom_detect&lat=${latitude}&lon=${longitude}&name=Detected%20Location&country=Live&countryCode=LOC`;
      },
      () => setIsLocating(false)
    );
  };

  useEffect(() => {
    if (!isReady) return;
    fetch(`/api/pulse?${apiQuery}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setPulse(data);
          setLiveVitals({
            overallStress: data.overallStress,
            mood: data.mood,
            moodEmoji: data.moodEmoji,
            weather: data.weather,
            cityName: data.cityName,
            nickname: data.nickname,
          });
        }
      })
      .catch(() => null);
    window.scrollTo(0, 0);
  }, [apiQuery, isReady]);

  useEffect(() => {
    if (pulse?.topAlerts && pulse.topAlerts.length > 0) {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newLogs = pulse.topAlerts.map((alert: string) => `[${time}] ${alert.toUpperCase()}`);
      setLogs(newLogs);
    } else {
      const rawLogs = [
        "[00036.01] CORE -> EDGE / fwd",
        "[00035.30] HUB -> NODE / ack",
        "[00034.61] HUB -> SYNC / sync",
        "[00033.20] EDGE -> CORE / fwd",
        "[00032.55] INITIALIZING_SENSORY_MESH",
      ];
      setLogs(rawLogs);
    }
  }, [pulse]);

  const districtCount = pulse?.boroughs ? Object.keys(pulse.boroughs).length : 0;
  const neighborhoodCount = pulse?.neighborhoods ? Object.keys(pulse.neighborhoods).length : 0;
  const tempUnit = liveVitals?.weather?.unit ?? 'F';
  const cityName = liveVitals?.cityName ?? city.name;
  const cityNameUpper = cityName.toUpperCase();
  const cityFlag = city.flag;

  return (
    <main className="relative min-h-screen appShell" data-theme={theme} style={{ background: 'var(--bg)', color: 'var(--text)', cursor: 'none' }}>
      <NeuralCursor />

      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#555]" style={{ background: 'var(--panel)', borderBottomColor: 'var(--panel-border)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L29 9.5V22.5L16 30L3 22.5V9.5L16 2Z" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M16 2V30" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.5"/>
              <path d="M3 9.5L29 22.5" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.5"/>
              <path d="M29 9.5L3 22.5" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.5"/>
              <circle cx="16" cy="16" r="4" fill="var(--accent)"/>
              <circle cx="16" cy="2" r="1.5" fill="var(--accent)"/>
              <circle cx="29" cy="9.5" r="1.5" fill="var(--accent)"/>
              <circle cx="29" cy="22.5" r="1.5" fill="var(--accent)"/>
              <circle cx="16" cy="30" r="1.5" fill="var(--accent)"/>
              <circle cx="3" cy="22.5" r="1.5" fill="var(--accent)"/>
              <circle cx="3" cy="9.5" r="1.5" fill="var(--accent)"/>
            </svg>
            <span style={{ color: 'var(--text)' }} className="font-bold">CITYMIND / KERNEL</span>
          </div>
          <div className="hidden sm:flex">
            <CitySelector />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-10">
          <Link href={`/dashboard?${apiQuery}`} className="transition-colors" style={{ color: theme === 'dark' ? '#555' : '#333' }}>Topology</Link>
          <a href="#mission" className="transition-colors" style={{ color: theme === 'dark' ? '#555' : '#333' }}>Mission</a>
          <a href="#genesis" className="transition-colors" style={{ color: theme === 'dark' ? '#555' : '#333' }}>Genesis</a>
          <Link href="/docs" className="transition-colors" style={{ color: theme === 'dark' ? '#555' : '#333' }}>Docs</Link>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="p-2 border border-white/10 rounded-full hover:border-[var(--accent)] transition-all group"
            aria-label="Toggle Theme"
            style={{ pointerEvents: 'auto' }}
          >
            {theme === 'dark' ? (
              <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l-.707.707M6.343 6.343l-.707.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <span>V 2.0 — NODE_{city.id.toUpperCase()}</span>
        </div>
      </nav>

      <div className="relative flex flex-col md:flex-row min-h-screen pt-16">
        <section className="flex-1 flex flex-col px-8 md:px-16 lg:px-24 py-20 pb-48 z-10">
          <motion.div
            key={`kicker-${city.id}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-8 text-[var(--accent)] font-mono text-[11px] uppercase tracking-[0.3em]"
          >
            <span className="w-2 h-2 bg-[var(--accent)]" />
            <span>{cityFlag} {cityNameUpper} {liveVitals?.nickname && <span className="opacity-50 ml-2">[{liveVitals.nickname}]</span>} · Real-time Edge Routing</span>
          </motion.div>

          <motion.h1
            key={`h1-${city.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="font-[var(--font-heading)] text-[clamp(2.5rem,8vw,5.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] max-w-2xl"
            style={{ color: 'var(--text)' }}
          >
            The city <br />
            has its own <br />
            <span className="text-[var(--accent)]">mind.</span>
          </motion.h1>

          {liveVitals?.nickname && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 font-mono text-[10px] uppercase tracking-[0.4em] opacity-60"
              style={{ color: 'var(--accent)', textShadow: '0 0 10px var(--accent-glow)' }}
            >
              // SYSTEM_IDENTITY: {liveVitals.nickname}
            </motion.div>
          )}

          <motion.p
            key={`p-${city.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-10 max-w-xl text-lg leading-relaxed font-medium"
            style={{ color: theme === 'dark' ? '#777' : '#222' }}
          >
            Non-living matter. Infinite intelligence. The steel and stone of {cityName} — and any city on Earth — have found a voice to think, talk, and feel.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-12 flex flex-wrap gap-4 items-center"
          >
            <Link
              href={`/dashboard?${apiQuery}`}
              className="px-8 py-3 border border-[var(--accent)] text-[var(--accent)] font-mono text-xs uppercase tracking-widest hover:bg-[var(--accent)] hover:text-black transition-all duration-300"
            >
              [ CONNECT TO {cityNameUpper} ] →
            </Link>
            <button
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="px-8 py-3 border font-mono text-xs uppercase tracking-widest transition-all duration-300"
              style={{ 
                borderColor: 'var(--panel-border)', 
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.05)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--panel-border)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {isLocating ? '[ LOCATING... ]' : '[ DETECT_CURRENT_LOCATION ]'}
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
              or press <kbd className="border px-1.5 py-0.5 rounded" style={{ borderColor: 'var(--panel-border)', color: 'var(--accent)' }}>⌘K</kbd> to switch city
            </span>
          </motion.div>

          <div className="mt-12 grid grid-cols-3 gap-8 border-t pt-10 max-w-xl" style={{ borderTopColor: 'var(--panel-border)' }}>
            <div>
              <div className="text-3xl font-bold leading-none" style={{ color: 'var(--text)' }}>
                {liveVitals ? (liveVitals.overallStress / 5).toFixed(1) : '12.4'}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>MS P99</div>
            </div>
            <div>
              <div className="text-3xl font-bold leading-none" style={{ color: 'var(--text)' }}>
                {neighborhoodCount > 0 ? `${neighborhoodCount}` : '50K'}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {neighborhoodCount > 0 ? 'NODES' : 'EVENTS/S'}
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold leading-none" style={{ color: 'var(--text)' }}>
                {districtCount > 0 ? districtCount : 5}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>DISTRICTS</div>
            </div>
          </div>
        </section>

        <section className="flex-1 relative min-h-[500px] md:min-h-0">
          <NeuralEdgeMap pulse={pulse} theme={theme} />

          <div className="absolute top-10 right-10 font-mono text-[10px] uppercase tracking-[0.2em] z-20 text-right">
            <div style={{ color: 'var(--text)' }}>{cityNameUpper}.NEURAL.GRID • LIVE</div>
            <div className="text-[var(--accent)]">
              {neighborhoodCount > 0 ? `${neighborhoodCount} NODES` : 'BOOTING NODES'} • {districtCount > 0 ? `${districtCount} DISTRICTS` : 'SYNCING'}
            </div>
            {liveVitals && (
              <div className="mt-1" style={{ color: 'var(--text-muted)' }}>
                {liveVitals.moodEmoji} {liveVitals.mood.toUpperCase()} · {liveVitals.weather.temp}°{tempUnit}
              </div>
            )}
          </div>
        </section>
      </div>

      <section id="mission" className="px-8 md:px-24 py-32 border-t bg-[var(--bg)]" style={{ borderTopColor: 'var(--panel-border)' }}>
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-10 text-[var(--accent)] font-mono text-[10px] uppercase tracking-[0.4em]">
            <span className="w-1.5 h-1.5 bg-[var(--accent)]" />
            <span>01 // THE_CONCEPT</span>
          </div>
          <h2 className="font-[var(--font-heading)] text-5xl md:text-7xl font-extrabold uppercase leading-[0.9] mb-12" style={{ color: 'var(--text)' }}>
            What is <span className="text-[var(--accent)]">CityMind?</span>
          </h2>
          <p className="text-xl md:text-2xl leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
            CityMind is a neural-geographic operating system that treats urban environments as living, sentient organisms. By bridging real-time spatial data with advanced linguistic models, we give cities a voice—allowing researchers, urban planners, and citizens to communicate with the steel, stone, and pulse of their environment.
          </p>
        </div>
      </section>

      <section id="genesis" className="px-8 md:px-24 py-32 border-t bg-[var(--bg)]" style={{ borderTopColor: 'var(--panel-border)' }}>
        <div className="max-w-4xl ml-auto text-right">
          <div className="flex items-center justify-end gap-3 mb-10 text-[var(--accent)] font-mono text-[10px] uppercase tracking-[0.4em]">
            <span>02 // THE_PURPOSE</span>
            <span className="w-1.5 h-1.5 bg-[var(--accent)]" />
          </div>
          <h2 className="font-[var(--font-heading)] text-5xl md:text-7xl font-extrabold uppercase leading-[0.9] mb-12" style={{ color: 'var(--text)' }}>
            Why was it <span className="text-[var(--accent)]">built?</span>
          </h2>
          <p className="text-xl md:text-2xl leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
            Standard city dashboards provide data, but they lack context. CityMind was built to transform cold metrics—like stress levels, congestion, and energy consumption—into empathetic, actionable narratives. We built this to bridge the gap between "what" is happening in a city and "why" it matters to the people living within it.
          </p>
        </div>
      </section>

      <footer className="px-8 py-16 border-t border-white/5 bg-[var(--bg)] flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex flex-col gap-6">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[#333]">PACKET TRACE - TAIL</div>
          <div className="flex flex-col gap-1">
            {logs.map((log, i) => (
              <div key={i} className="font-mono text-[10px] text-[#555]" style={{ opacity: 1 - i * 0.2 }}>
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: 'var(--text)' }}>
          <a
            href="https://github.com/noobacker/CityMind"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all border-b-2 pb-1 font-black"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            [ SOURCE_CODE ]
          </a>
          <div className="flex flex-col items-center md:items-end">
            <span className="font-black text-[13px] tracking-[0.4em] drop-shadow-[0_0_15px_var(--accent-glow)]" style={{ color: 'var(--text)' }}>BY NOOBACKER</span>
            <span className="mt-1 text-[9px] opacity-70 font-bold tracking-[0.2em]">© {new Date().getFullYear()} CITYMIND_KERNEL</span>
          </div>
        </div>
      </footer>

      <div className="fixed inset-0 pointer-events-none z-[100] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="fixed inset-0 pointer-events-none z-[101] opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </main>
  );
}
