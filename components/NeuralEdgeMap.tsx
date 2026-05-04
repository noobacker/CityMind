'use client';

import React, { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

interface DistrictNode {
  id: string;
  name: string;
  x: number;
  y: number;
  stress: number;
  hasRealData: boolean;
}

const FALLBACK_NODES: DistrictNode[] = [
  { id: 'manhattan', name: 'MANHATTAN CORE', x: 42, y: 32, stress: 14.7, hasRealData: false },
  { id: 'brooklyn', name: 'BROOKLYN EDGE', x: 52, y: 65, stress: 16.0, hasRealData: false },
  { id: 'queens', name: 'QUEENS NODE', x: 68, y: 38, stress: 15.2, hasRealData: false },
  { id: 'bronx', name: 'BRONX HUB', x: 58, y: 15, stress: 14.1, hasRealData: false },
  { id: 'statenIsland', name: 'STATEN ISLAND', x: 24, y: 72, stress: 18.4, hasRealData: false },
];

function nodesFromPulse(pulse: any): DistrictNode[] {
  if (!pulse?.neighborhoods) return FALLBACK_NODES;
  const neighborhoodList: any[] = Object.values(pulse.neighborhoods);
  if (neighborhoodList.length === 0) return FALLBACK_NODES;

  // Pick top 8 most stressed neighborhoods to keep it clean but representative
  const sorted = [...neighborhoodList].sort((a, b) => b.stress - a.stress).slice(0, 8);
  
  const lats = sorted.map((n) => n.lat);
  const lons = sorted.map((n) => n.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latRange = maxLat - minLat || 0.01;
  const lonRange = maxLon - minLon || 0.01;

  return sorted.map((n) => {
    // SVG: y=0 at top, so flip lat. Scale for more padding
    const x = 20 + ((n.lon - minLon) / lonRange) * 60;
    const y = 22 + ((maxLat - n.lat) / latRange) * 56;
    return {
      id: n.name,
      name: n.name.toUpperCase(),
      x,
      y,
      stress: n.stress,
      hasRealData: true,
    };
  });
}

export const NeuralEdgeMap = React.memo(({ pulse, theme = 'dark' }: { pulse: any; theme?: 'dark' | 'light' }) => {
  const nodes = useMemo(() => nodesFromPulse(pulse), [pulse]);

  const connections = useMemo(() => {
    const conn: { from: string; to: string }[] = [];
    if (nodes.length < 2) return conn;
    // Connect each node to its 1-2 nearest neighbors
    for (const a of nodes) {
      const others = nodes.filter((n) => n.id !== a.id);
      const sorted = others.sort((x, y) => {
        const dx = (x.x - a.x) ** 2 + (x.y - a.y) ** 2;
        const dy = (y.x - a.x) ** 2 + (y.y - a.y) ** 2;
        return dx - dy;
      });
      for (const b of sorted.slice(0, 2)) {
        const exists = conn.find((c) => (c.from === a.id && c.to === b.id) || (c.from === b.id && c.to === a.id));
        if (!exists) conn.push({ from: a.id, to: b.id });
      }
    }
    return conn;
  }, [nodes]);

  const [activeNodes, setActiveNodes] = useState<string[]>([]);
  const [pulses, setPulses] = useState<{ id: number; from: DistrictNode; to: DistrictNode }[]>([]);

  useEffect(() => {
    if (connections.length === 0) return;
    const interval = setInterval(() => {
      const conn = connections[Math.floor(Math.random() * connections.length)];
      const fromNode = nodes.find((b) => b.id === conn.from);
      const toNode = nodes.find((b) => b.id === conn.to);
      if (fromNode && toNode) {
        setActiveNodes((prev) => [...prev.slice(-2), conn.from, conn.to]);
        const pulseId = Date.now();
        setPulses((prev) => [...prev.slice(-8), { id: pulseId, from: fromNode, to: toNode }]);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [nodes, connections]);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: `linear-gradient(${theme === 'dark' ? 'var(--accent)' : '#444'} 0.5px, transparent 0.5px), linear-gradient(90deg, ${theme === 'dark' ? 'var(--accent)' : '#444'} 0.5px, transparent 0.5px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <svg viewBox="0 0 100 100" className="w-full h-full max-w-[900px] overflow-visible">
        <defs>
          <filter id="ultra-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="0.15">
          {connections.map((c, i) => {
            const f = nodes.find((b) => b.id === c.from);
            const t = nodes.find((b) => b.id === c.to);
            if (!f || !t) return null;
            return <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y} />;
          })}
        </g>

        <AnimatePresence>
          {pulses.map((p) => (
            <motion.path
              key={p.id}
              d={`M ${p.from.x} ${p.from.y} L ${p.to.x} ${p.to.y}`}
              initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 0.2, 0.2, 0],
                pathOffset: [0, 0.4, 0.8, 1],
                opacity: [0, 1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              stroke="var(--accent)"
              strokeWidth="0.4"
              strokeLinecap="round"
              fill="none"
              style={{ filter: 'url(#ultra-glow)' }}
            />
          ))}
        </AnimatePresence>

        {nodes.map((b) => {
          const isActive = activeNodes.includes(b.id);
          const stressValue = b.stress;
          const displayLabel = b.hasRealData ? 'STRESS_LOAD' : 'EST_LATENCY';

          return (
            <g key={b.id}>
              {isActive && (
                <motion.circle
                  cx={b.x}
                  cy={b.y}
                  initial={{ r: 0, opacity: 0.8 }}
                  animate={{ r: stressValue / 8, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  stroke={stressValue > 70 ? '#ff004c' : 'var(--accent)'}
                  strokeWidth="0.1"
                  fill="none"
                />
              )}

              <motion.circle
                cx={b.x}
                cy={b.y}
                animate={{
                  r: isActive ? 0.8 : 0.4,
                  fill: stressValue > 70 ? '#ff004c' : isActive ? 'var(--accent)' : theme === 'dark' ? '#444' : '#ccc',
                }}
                style={{ filter: isActive ? 'url(#ultra-glow)' : '' }}
              />

              <foreignObject x={b.x + 3} y={b.y - 8} width="40" height="20">
                <div className="font-mono text-[1.4px] leading-none">
                  <div className={`flex items-center gap-[1px] mb-[1px] uppercase ${isActive ? (stressValue > 70 ? 'text-[#ff004c]' : 'text-[var(--accent)]') : theme === 'dark' ? 'text-white/30' : 'text-black/30'}`}>
                    <span className={`w-[1.2px] h-[1.2px] ${isActive ? (stressValue > 70 ? 'bg-[#ff004c] shadow-[0_0_2px_#ff004c]' : 'bg-[var(--accent)] shadow-[0_0_2px_var(--accent)]') : theme === 'dark' ? 'bg-white/20' : 'bg-black/20'}`} />
                    {b.name}
                  </div>
                  <div className={`${theme === 'dark' ? 'text-white/20' : 'text-black/40'} text-[1px] mb-[0.5px] uppercase`}>{displayLabel}</div>
                  <motion.div
                    animate={{ color: isActive ? (theme === 'dark' ? '#fff' : '#000') : theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)' }}
                    className="text-[1.8px] font-bold"
                  >
                    {stressValue.toFixed(1)}{b.hasRealData ? '%' : 'ms'}
                  </motion.div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

NeuralEdgeMap.displayName = 'NeuralEdgeMap';
