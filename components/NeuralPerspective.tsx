'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CityPulse } from '@/lib/types';
import { BOROUGH_LABELS } from '@/lib/constants/neighborhoods';

interface NeuralPerspectiveProps {
  pulse: CityPulse;
  isOpen: boolean;
  onClose: () => void;
}

export function NeuralPerspective({ pulse, isOpen, onClose }: NeuralPerspectiveProps) {
  // Aggregate data for the perspective
  const topIssues = Object.entries(pulse.neighborhoods)
    .sort((a, b) => b[1].stress - a[1].stress)
    .slice(0, 5);

  const hazardousAreas = Object.entries(pulse.neighborhoods)
    .filter(([, n]) => n.stress > 70)
    .map(([name]) => name);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-5xl bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)',
              borderColor: 'var(--panel-border)' 
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white uppercase font-[var(--font-heading)]">Neural NYC Perspective</h2>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#555] mt-1">Cross-Domain City Intelligence Audit</p>
              </div>
              <button 
                onClick={onClose}
                className="px-4 py-2 text-[10px] uppercase font-bold tracking-widest border border-white/10 rounded hover:bg-white/5 transition-colors"
              >
                Exit_Core
              </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5 overflow-y-auto max-h-[70vh]">
              
              {/* EMOTION / MOOD */}
              <div className="p-8 space-y-6">
                <div>
                  <div className="text-[10px] font-bold text-[#ccff00] tracking-widest uppercase mb-4">01_SOCIAL_PULSE</div>
                  <div className="text-5xl mb-2">{pulse.moodEmoji}</div>
                  <div className="text-3xl font-black uppercase tracking-tighter text-white">{pulse.mood}</div>
                </div>

                {pulse.socialMesh && (
                  <div className="p-4 bg-[#ccff00]/5 border border-[#ccff00]/20 rounded-xl">
                    <div className="text-[10px] text-[#ccff00] uppercase font-bold mb-1">TRENDING_VIBE</div>
                    <div className="text-lg font-bold text-white uppercase italic">" {pulse.socialMesh.trendingVibe} "</div>
                    <div className="text-[10px] text-[#777] mt-2 tracking-widest uppercase">
                      HOTSPOT: {pulse.socialMesh.hotspot} // VIBRANCY: {pulse.socialMesh.vibrancyScore}%
                    </div>
                  </div>
                )}

                <div className="space-y-4">

                  {Object.entries(pulse.boroughs).map(([id, b]) => (
                    <div key={id} className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-[#777]">
                        <span>{BOROUGH_LABELS[id as keyof typeof BOROUGH_LABELS]}</span>
                        <span>{b.stress}% Tension</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${b.stress}%` }}
                          className="height-full bg-[#ccff00]"
                          style={{ height: '100%', backgroundColor: b.stress > 60 ? 'var(--stress)' : '#ccff00' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PROBLEMS / HAZARDS */}
              <div className="p-8 space-y-6">
                <div>
                  <div className="text-[10px] font-bold text-[#ff3b3b] tracking-widest uppercase mb-4">02_ACTIVE_HAZARDS</div>
                  <div className="space-y-4">
                    {topIssues.map(([name, n]) => (
                      <div key={name} className="p-3 border border-white/5 bg-white/[0.02] rounded-lg">
                        <div className="text-[10px] font-mono text-[#ff3b3b] mb-1">{n.topComplaint.toUpperCase()}</div>
                        <div className="text-sm font-bold text-white">{name}</div>
                        <div className="text-[10px] text-[#555] uppercase tracking-tighter">{BOROUGH_LABELS[n.borough]} · {n.stress}/100</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ISSUES / INFRASTRUCTURE */}
              <div className="p-8 space-y-6">
                <div>
                  <div className="text-[10px] font-bold text-[#00f0ff] tracking-widest uppercase mb-4">03_SYSTEMIC_ISSUES</div>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                      <div className="text-[10px] text-[#555] uppercase mb-1">MTA_STATUS</div>
                      <div className="font-bold text-white text-sm">{pulse.mta.severity.toUpperCase()}</div>
                      <div className="text-[10px] text-[#00f0ff] mt-2 line-clamp-2">
                        {pulse.mta.affectedLines.length > 0 ? `Lines: ${pulse.mta.affectedLines.join(', ')}` : 'Full capacity alignment.'}
                      </div>
                    </div>
                    <div className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
                      <div className="text-[10px] text-[#555] uppercase mb-1">AIR_QUALITY_METRIC</div>
                      <div className="font-bold text-white text-sm">{pulse.airQuality.aqi} / 5 AQI</div>
                      <div className="text-[10px] text-[#00f0ff] mt-2">
                        Primary Stressor: PM2.5 at {pulse.airQuality.pm25}µg/m³
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NEURAL FIXES */}
              <div className="p-8 space-y-6 bg-[#ccff00]/5">
                <div>
                  <div className="text-[10px] font-bold text-[#ccff00] tracking-widest uppercase mb-4">04_NEURAL_RECOVERY</div>
                  <div className="space-y-4">
                    <div className="text-sm text-white/80 leading-relaxed font-mono">
                      <span className="text-[#ccff00] font-bold">RECOVERY_PROTOCOL:</span>
                      <br />Focus resources on <span className="text-white font-bold">{hazardousAreas[0] || 'Lower Manhattan'}</span>. Deploy noise-dampening routing for MTA lines in {pulse.airQuality.worstBorough}. 
                      <br /><br />
                      <span className="text-[#ccff00] font-bold">ESTIMATED_STABILIZATION:</span>
                      <br />6.4 Hours until neural equilibrium.
                    </div>
                    <div className="pt-4 border-t border-white/10">
                       <div className="text-[10px] text-[#555] uppercase mb-2">FIX_SUGGESTION</div>
                       <div className="text-xs font-bold text-white italic">"Ventilation cycling required in dense subway junctions to flush particulate matter."</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex justify-between text-[9px] uppercase tracking-[0.2em] text-[#444] font-mono">
              <span>CityMind 1.0.4 // Kernel Version: NYC_NODE_STABLE</span>
              <span>Scanning {Object.keys(pulse.neighborhoods).length} neural nodes...</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
