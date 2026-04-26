"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-black text-[#e1e7ef] font-mono selection:bg-[#ccff00] selection:text-black">
      {/* ── HEADER ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-md border-b border-white/5 text-[10px] uppercase tracking-[0.2em] text-[#555]">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-2 h-2 bg-[#ccff00] rounded-full group-hover:animate-ping" />
            <span className="text-white font-bold">CITYMIND / DOCS</span>
          </Link>
        </div>
        <Link href="/dashboard" className="text-[#ccff00] hover:text-white transition-colors">[ LAUNCH_KERNEL ]</Link>
      </nav>

      <div className="flex pt-16">
        {/* ── SIDEBAR ── */}
        <aside className="hidden lg:block w-72 h-[calc(100vh-64px)] sticky top-16 border-r border-white/5 p-8 text-[11px] uppercase tracking-widest text-[#444]">
          <div className="flex flex-col gap-8">
            <div>
              <div className="text-white mb-4">01_CORE ARCHITECTURE</div>
              <div className="flex flex-col gap-3 ml-4">
                <Link href="#kernel" className="hover:text-[#ccff00] transition-colors">Neural Kernel</Link>
                <Link href="#sensory" className="hover:text-[#ccff00] transition-colors">Sensory Grid</Link>
                <Link href="#routing" className="hover:text-[#ccff00] transition-colors">Edge Routing</Link>
              </div>
            </div>
            <div>
              <div className="text-white mb-4">02_INFOHAZARDS</div>
              <div className="flex flex-col gap-3 ml-4">
                <Link href="#ethics" className="hover:text-[#ccff00] transition-colors">Safety Filter</Link>
                <Link href="#privacy" className="hover:text-[#ccff00] transition-colors">Zero-Knowledge</Link>
              </div>
            </div>
            <div>
              <div className="text-white mb-4">03_DATA_SOURCES</div>
              <div className="flex flex-col gap-3 ml-4">
                <Link href="#api-credits" className="hover:text-[#ccff00] transition-colors">API Credits</Link>
              </div>
            </div>
          </div>
        </aside>

        {/* ── CONTENT ── */}
        <div className="flex-1 max-w-4xl px-8 lg:px-16 py-16 scroll-smooth">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-white mb-8 select-none">SYSTEM_ARCHITECTURE</h1>
            
            <section id="kernel" className="mb-20 scroll-mt-24">
              <h2 className="text-[#ccff00] text-sm uppercase tracking-widest mb-6 underline decoration-[#ccff00]/20 underline-offset-8">01 // Neural Kernel</h2>
              <p className="text-sm leading-7 text-[#888] mb-6 font-sans">
                The CityMind Kernel is a distributed inference engine that treats urban data as high-dimensional neural activity. 
                Instead of processing metrics in isolation, it correlates 311 service logs, MTA transit pulses, and micro-climate 
                telemetry to detect systemic drift.
              </p>
              <div className="bg-white/5 border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-[#ccff00]" />
                  <span className="text-[10px] text-white">LATENCY_PROTOCOL_v4.0</span>
                </div>
                <code>
                  {"{ \"signal\": \"p99_delivery\", \"node\": \"MN-CORE\", \"drift\": \"+0.042ms\" }"}
                </code>
              </div>
            </section>

            <section id="sensory" className="mb-20 scroll-mt-24">
              <h2 className="text-[#ccff00] text-sm uppercase tracking-widest mb-6 underline decoration-[#ccff00]/20 underline-offset-8">02 // Sensory Grid</h2>
              <p className="text-sm leading-7 text-[#888] mb-6 font-sans">
                The grid ingests fifty thousand events per second from the Edge. Our primary data paths include:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-[#aaa]">
                <li className="border border-white/5 p-4 bg-white/2 bg-opacity-50">
                  <span className="text-[#ccff00] block mb-1">ACOUSTIC DENSITY</span>
                  Monitoring noise pollution to predict residential stress spikes via NYC Open Data.
                </li>
                <li className="border border-white/5 p-4 bg-white/2 bg-opacity-50">
                  <span className="text-[#ccff00] block mb-1">TRANSIT FLOW</span>
                  MTA line-state ingestion via real-time scraping and official alert sync.
                </li>
                <li className="border border-white/5 p-4 bg-white/2 bg-opacity-50">
                  <span className="text-[#ccff00] block mb-1">ENV_NODES</span>
                  Air Quality Index (AQI) provided by OpenWeatherMap sensors.
                </li>
                <li className="border border-white/5 p-4 bg-white/2 bg-opacity-50">
                  <span className="text-[#ccff00] block mb-1">CIVIC_VOICE</span>
                  Live 311 complaint aggregation for neighborhood urgency scores.
                </li>
              </ul>
            </section>

            <section id="routing" className="mb-20 scroll-mt-24">
              <h2 className="text-[#ccff00] text-sm uppercase tracking-widest mb-6 underline decoration-[#ccff00]/20 underline-offset-8">03 // Edge Routing</h2>
              <p className="text-sm leading-7 text-[#888] font-sans">
                By processing data at the neighborhood level (Edge), we reduce the round-trip latency to under 15ms. 
                This allows CityMind to provide immediate recommendations for traffic diversion and emergency services.
              </p>
            </section>

            <section id="ethics" className="mb-20 scroll-mt-24">
              <h2 className="text-[#ccff00] text-sm uppercase tracking-widest mb-6 underline decoration-[#ccff00]/20 underline-offset-8">04 // Safety Filter</h2>
              <p className="text-sm leading-7 text-[#888] font-sans">
                To ensure the city's mind remains helpful and safe, every inference passes through a recursive safety filter. 
                This prevents the system from prioritizing cold mechanical efficiency over human well-being.
              </p>
            </section>

            <section id="privacy" className="mb-20 scroll-mt-24">
              <h2 className="text-[#ccff00] text-sm uppercase tracking-widest mb-6 underline decoration-[#ccff00]/20 underline-offset-8">05 // Zero-Knowledge</h2>
              <p className="text-sm leading-7 text-[#888] font-sans">
                We utilize ZK-proofs to verify urban patterns without ever exposing individual resident identities. 
                The city knows the "state" of a block, but never the identity of its occupants.
              </p>
            </section>

            <section id="api-credits" className="mb-32 scroll-mt-24 border-t border-white/5 pt-12">
              <h2 className="text-[#ccff00] text-sm uppercase tracking-widest mb-8">External_API_Credits</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
                <div>
                  <h3 className="text-white text-xs uppercase mb-2 tracking-widest">NYC Open Data (311)</h3>
                  <p className="text-[12px] text-[#666] mb-2 leading-relaxed">Aggregating real-time service requests to calculate neighborhood stress levels.</p>
                  <a href="https://opendata.cityofnewyork.us/" target="_blank" className="text-[10px] text-[#ccff00] hover:underline">[ opendata.cityofnewyork.us ]</a>
                </div>
                <div>
                  <h3 className="text-white text-xs uppercase mb-2 tracking-widest">NYC SAPA (Events)</h3>
                  <p className="text-[12px] text-[#666] mb-2 leading-relaxed">Tracking permitted urban events and crowd density via Street Activity Permit Office.</p>
                  <a href="https://data.cityofnewyork.us/City-Government/NYC-Permitted-Event-Information-SAPA/7p5v-9p9v" target="_blank" className="text-[10px] text-[#ccff00] hover:underline">[ data.cityofnewyork.us ]</a>
                </div>
                <div>
                  <h3 className="text-white text-xs uppercase mb-2 tracking-widest">MTA Transit</h3>
                  <p className="text-[12px] text-[#666] mb-2 leading-relaxed">Real-time subway and bus disruption telemetry via live status scraping.</p>
                  <a href="https://new.mta.info/" target="_blank" className="text-[10px] text-[#ccff00] hover:underline">[ new.mta.info ]</a>
                </div>
                <div>
                  <h3 className="text-white text-xs uppercase mb-2 tracking-widest">OpenWeatherMap</h3>
                  <p className="text-[12px] text-[#666] mb-2 leading-relaxed">Global air quality monitoring (AQI) and PM2.5 particulate sensor data.</p>
                  <a href="https://openweathermap.org/" target="_blank" className="text-[10px] text-[#ccff00] hover:underline">[ openweathermap.org ]</a>
                </div>
                <div>
                  <h3 className="text-white text-xs uppercase mb-2 tracking-widest">Open-Meteo</h3>
                  <p className="text-[12px] text-[#666] mb-2 leading-relaxed">Providing foundational meteorological grids for NYC precinct weather states.</p>
                  <a href="https://open-meteo.com/" target="_blank" className="text-[10px] text-[#ccff00] hover:underline">[ open-meteo.com ]</a>
                </div>
              </div>
            </section>
          </motion.div>
        </div>
      </div>

      {/* Footer Line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-[#ccff00]/20 z-50" />
    </main>
  );
}
