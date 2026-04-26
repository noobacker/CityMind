import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

const boroughs = [
  { 
    id: "manhattan", 
    name: "MANHATTAN CORE", 
    path: "M 38 22 L 42 18 L 46 22 L 44 48 L 40 50 L 38 48 Z", 
    x: 42, y: 32, latency: 14.7 
  },
  { 
    id: "brooklyn", 
    name: "BROOKLYN EDGE", 
    path: "M 44 50 L 50 50 L 62 55 L 60 75 L 50 82 L 42 75 Z", 
    x: 52, y: 65, latency: 16.0 
  },
  { 
    id: "queens", 
    name: "QUEENS NODE", 
    path: "M 46 22 L 60 20 L 80 25 L 85 45 L 75 55 L 62 55 L 50 50 Z", 
    x: 68, y: 38, latency: 15.2 
  },
  { 
    id: "bronx", 
    name: "BRONX HUB", 
    path: "M 46 12 L 60 8 L 70 12 L 68 22 L 55 24 L 46 22 Z", 
    x: 58, y: 15, latency: 14.1 
  },
  { 
    id: "statenIsland", 
    name: "STATEN ISLAND", 
    path: "M 22 55 L 35 62 L 32 82 L 18 85 L 15 70 Z", 
    x: 24, y: 72, latency: 18.4 
  },
];

const connections = [
  { from: "manhattan", to: "brooklyn" },
  { from: "manhattan", to: "queens" },
  { from: "manhattan", to: "bronx" },
  { from: "queens", to: "brooklyn" },
  { from: "brooklyn", to: "statenIsland" },
];

export function NeuralEdgeMap({ pulse, theme = 'dark' }: { pulse: any; theme?: 'dark' | 'light' }) {

  const [activeNodes, setActiveNodes] = useState<string[]>([]);
  const [pulses, setPulses] = useState<{ id: number; from: any; to: any }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const conn = connections[Math.floor(Math.random() * connections.length)];
      const fromNode = boroughs.find(b => b.id === conn.from);
      const toNode = boroughs.find(b => b.id === conn.to);
      
      if (fromNode && toNode) {
        setActiveNodes(prev => [...prev.slice(-2), conn.from, conn.to]);
        
        const pulseId = Date.now();
        setPulses(prev => [...prev.slice(-8), { id: pulseId, from: fromNode, to: toNode }]);
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 overflow-hidden pointer-events-none">
      {/* Dynamic Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.25]" 
           style={{ backgroundImage: `linear-gradient(${theme === 'dark' ? '#ccff00' : '#444'} 0.5px, transparent 0.5px), linear-gradient(90deg, ${theme === 'dark' ? '#ccff00' : '#444'} 0.5px, transparent 0.5px)`, backgroundSize: '40px 40px' }} 
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

        {/* Static Base Connections */}
        <g stroke={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="0.15">
          {connections.map((c, i) => {
            const f = boroughs.find(b => b.id === c.from);
            const t = boroughs.find(b => b.id === c.to);
            if (!f || !t) return null;
            return <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y} />;
          })}

        </g>


        {/* Data Synapses (Traveling Dash) */}
        <AnimatePresence>
          {pulses.map(p => (
            <motion.path
              key={p.id}
              d={`M ${p.from.x} ${p.from.y} L ${p.to.x} ${p.to.y}`}
              initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 0.2, 0.2, 0],
                pathOffset: [0, 0.4, 0.8, 1],
                opacity: [0, 1, 1, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              stroke="#ccff00"
              strokeWidth="0.4"
              strokeLinecap="round"
              fill="none"
              style={{ filter: 'url(#ultra-glow)' }}
            />
          ))}
        </AnimatePresence>


        {/* Borough Geometry */}
        {boroughs.map((b) => {
          const isActive = activeNodes.includes(b.id);
          // Use real pulse data if available, otherwise fallback to seed latency
          const realBoroughData = pulse?.boroughs ? pulse.boroughs[b.id] : null;
          const stressValue = realBoroughData ? realBoroughData.stress : b.latency;
          const displayLabel = realBoroughData ? "STRESS_LOAD" : "EST_LATENCY";

          return (
            <g key={b.id}>
              <motion.path
                d={b.path}
                animate={{ 
                  fill: isActive ? "rgba(204,255,0,0.12)" : (theme === 'dark' ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)"),
                  stroke: isActive ? "rgba(204,255,0,0.4)" : (theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
                }}

                strokeWidth="0.15"
                transition={{ duration: 0.5 }}
              />
              
              {/* Ripple Echo Effect */}
              {isActive && (
                <motion.circle
                  cx={b.x}
                  cy={b.y}
                  initial={{ r: 0, opacity: 0.8 }}
                  animate={{ r: stressValue / 8, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  stroke={stressValue > 70 ? "#ff004c" : "#ccff00"}
                  strokeWidth="0.1"
                  fill="none"
                />
              )}

              {/* Central Node */}
              <motion.circle
                cx={b.x}
                cy={b.y}
                animate={{ 
                  r: isActive ? 0.8 : 0.4,
                  fill: stressValue > 70 ? "#ff004c" : (isActive ? "#ccff00" : (theme === 'dark' ? "#444" : "#ccc"))
                }}
                style={{ filter: isActive ? 'url(#ultra-glow)' : '' }}
              />


              {/* Node Metadata (STRESS BOX) */}
              <foreignObject x={b.x + 3} y={b.y - 5} width="24" height="12">
                <div className="font-mono text-[1.4px] leading-none">
                  <div className={`flex items-center gap-[1px] mb-[1px] uppercase ${isActive ? (stressValue > 70 ? 'text-[#ff004c]' : 'text-[#ccff00]') : (theme === 'dark' ? 'text-white/30' : 'text-black/30')}`}>
                    <span className={`w-[1.2px] h-[1.2px] ${isActive ? (stressValue > 70 ? 'bg-[#ff004c] shadow-[0_0_2px_#ff004c]' : 'bg-[#ccff00] shadow-[0_0_2px_#ccff00]') : (theme === 'dark' ? 'bg-white/20' : 'bg-black/20')}`} />
                    {b.name}
                  </div>
                  <div className={`${theme === 'dark' ? 'text-white/20' : 'text-black/40'} text-[1px] mb-[0.5px] uppercase`}>{displayLabel}</div>
                  <motion.div 
                    animate={{ color: isActive ? (theme === 'dark' ? "#fff" : "#000") : (theme === 'dark' ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)") }}
                    className="text-[1.8px] font-bold"
                  >
                    {stressValue.toFixed(1)}{realBoroughData ? "%" : "ms"}
                  </motion.div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
