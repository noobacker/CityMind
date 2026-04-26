"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NeuralEdgeMap } from "@/components/NeuralEdgeMap";
import { NeuralCursor } from "@/components/NeuralCursor";


type LiveVitals = { overallStress: number; mood: string; moodEmoji: string; weather: { temp: number } };

export default function LandingPage() {
  const [pulse, setPulse] = useState<any>(null);
  const [liveVitals, setLiveVitals] = useState<LiveVitals | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');


  useEffect(() => {
    fetch('/api/pulse')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setPulse(data);
          setLiveVitals({
            overallStress: data.overallStress,
            mood: data.mood,
            moodEmoji: data.moodEmoji,
            weather: data.weather
          });
        }
      })
      .catch(() => null);

    window.scrollTo(0, 0);
  }, []);



  useEffect(() => {
    if (pulse?.topAlerts) {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newLogs = pulse.topAlerts.map((alert: string) => `[${time}] ${alert.toUpperCase()}`);
      setLogs(newLogs);
    } else {
      const rawLogs = [
        "[00036.01] QNS-CORE -> AST-06 / fwd",
        "[00035.30] HRL-04 -> BRK-CORE / ack",
        "[00034.61] MN-HUB -> MKT-04 / sync",
        "[00033.20] BRX-02 -> STN-CORE / fwd",
        "[00032.55] INITIALIZING_SENSORY_MESH",
      ];
      setLogs(rawLogs);
    }
  }, [pulse]);

  return (
    <main className="relative min-h-screen appShell" data-theme={theme} style={{ background: 'var(--bg)', color: 'var(--text)', cursor: 'none' }}>
      <NeuralCursor />


      {/* ── TOP NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-white/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#555]" style={{ background: 'var(--panel)', borderBottomColor: 'var(--panel-border)' }}>
        <div className="flex items-center gap-6">

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse" />
            <span style={{ color: 'var(--text)' }} className="font-bold">CITYMIND / KERNEL</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          <Link href="/dashboard" className="transition-colors" style={{ color: theme === 'dark' ? '#555' : '#333' }}>Topology</Link>
          <Link href="/docs" className="transition-colors" style={{ color: theme === 'dark' ? '#555' : '#333' }}>Docs</Link>

        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="p-2 border border-white/10 rounded-full hover:border-[#ccff00] transition-all group"
            aria-label="Toggle Theme"
            style={{ pointerEvents: 'auto' }}
          >
            {theme === 'dark' ? (
              <svg className="w-3 h-3 text-[#ccff00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l-.707.707M6.343 6.343l-.707.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <span>V 1.0.4 - NODE_NYC</span>
        </div>
      </nav>


      {/* ── HERO SECTION ── */}
      <div className="relative flex flex-col md:flex-row min-h-screen pt-16">
        
        {/* Left Side: Copy */}
        <section className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-20 z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 mb-8 text-[#ccff00] font-mono text-[11px] uppercase tracking-[0.3em]"
          >
            <span className="w-2 h-2 bg-[#ccff00]" />
            Real-time Edge Routing
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="font-[var(--font-heading)] text-[clamp(2.5rem,8vw,5.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] max-w-2xl"
            style={{ color: 'var(--text)' }}
          >
            The city <br />
            has its own <br />
            <span className="text-[#ccff00]">mind.</span>
          </motion.h1>



          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-10 max-w-xl text-lg leading-relaxed font-medium"
            style={{ color: theme === 'dark' ? '#777' : '#222' }}
          >
            Non-living matter. Infinite intelligence. The steel and stone of New York have found a voice to think, talk, and feel.
          </motion.p>



          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-12 flex flex-wrap gap-4"
          >
            <Link
              href="/dashboard"
              className="px-8 py-3 border border-[#ccff00] text-[#ccff00] font-mono text-xs uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-all duration-300"
            >
              [ CONNECT TO MIND ] →
            </Link>
            
          </motion.div>

          {/* Metrics */}
          <div className="mt-20 grid grid-cols-3 gap-8 border-t border-white/5 pt-10 max-w-xl">
            <div>
              <div className="text-3xl font-bold leading-none" style={{ color: 'var(--text)' }}>
                {liveVitals ? (liveVitals.overallStress / 5).toFixed(1) : "12.4"}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#444]">MS P99</div>
            </div>
            <div>
              <div className="text-3xl font-bold leading-none" style={{ color: 'var(--text)' }}>50K</div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#444]">EVENTS/S</div>
            </div>
            <div>
              <div className="text-3xl font-bold leading-none" style={{ color: 'var(--text)' }}>5</div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#444]">BOROUGHS</div>
            </div>
          </div>

        </section>

        {/* Right Side: Map Visual */}
        <section className="flex-1 relative min-h-[500px] md:min-h-0">
          <NeuralEdgeMap pulse={pulse} theme={theme} />

          
          {/* Overlay Vitals */}
          <div className="absolute top-10 right-10 font-mono text-[10px] uppercase tracking-[0.2em] z-20 text-right">
            <div style={{ color: theme === 'dark' ? '#444' : '#222' }}>NYC.NEURAL.GRID • LIVE</div>
            <div className="text-[#ccff00]">15 NODES • 12 SYNAPSES • 5 BOROUGHS</div>
          </div>

        </section>
      </div>

      {/* ── FOOTER ── */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-6 z-50 flex items-end justify-between pointer-events-none">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-[#333] mb-2">PACKET TRACE - TAIL</div>
          <div className="flex flex-col gap-1">
            {logs.map((log, i) => (
              <div key={i} className="font-mono text-[10px] text-[#666]" style={{ opacity: 1 - i * 0.2 }}>
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.2em] text-[#444]">
          <a 
            href="https://github.com/noobacker/CityMind" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-[#ccff00] transition-colors"
          >
            [ SOURCE_CODE ]
          </a>
          <div className="flex flex-col items-end">
            <span className="text-[#666]">BY NOOBACKER</span>
            <span className="mt-1 text-[8px] opacity-40">© {new Date().getFullYear()} NYC_KERNEL</span>
          </div>
        </div>
      </footer>

      {/* Vignette & Grain */}
      <div className="fixed inset-0 pointer-events-none z-[100] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="fixed inset-0 pointer-events-none z-[101] opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </main>
  );
}
