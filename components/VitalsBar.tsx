import type { CityPulse } from '@/lib/types';
import { CitySelector } from './CitySelector';

interface VitalsBarProps {
  pulse: Pick<CityPulse, 'overallStress' | 'mood' | 'moodEmoji' | 'mta' | 'airQuality' | 'weather' | 'topAlerts'> & {
    cityName?: string;
    cityIdentity?: CityPulse['cityIdentity'];
  };
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenPerspective: () => void;
}

export function VitalsBar({ pulse, theme, onToggleTheme, onOpenPerspective }: VitalsBarProps) {
  const stressClass = pulse.overallStress < 35 ? 'good' : pulse.overallStress < 65 ? 'warn' : 'danger';
  const stressColor = pulse.overallStress < 35 ? '#00ff9d' : pulse.overallStress < 65 ? '#ffb800' : '#ff3366';
  const stressPct = Math.min(100, pulse.overallStress);
  const tempUnit = pulse.weather.unit ?? 'F';
  const transitLabel = pulse.mta.label ?? 'TRANSIT';

  return (
    <header className="vitalsBar">
      <div className="brandBlock">
        <div className="brandLogo">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3" fill="currentColor" opacity="0.9" />
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
            <line x1="2" y1="9" x2="5" y2="9" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
            <line x1="13" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
            <line x1="9" y1="2" x2="9" y2="5" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
            <line x1="9" y1="13" x2="9" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
          </svg>
        </div>

        <span className="brandTitle">CITYMIND</span>
        <div className="brandPulse" />
      </div>

      <div className="citySelectorSlot">
        <CitySelector />
      </div>

      <div className="stressBlock">
        <div className="stressLabel">
          <span className={`stressPill ${stressClass}`}>STRESS</span>
          <span className="stressNum" style={{ color: stressColor }}>{pulse.overallStress}</span>
          <span className="stressOf">/100</span>
        </div>
        <div className="stressTrack">
          <div
            className="stressFill"
            style={{ width: `${stressPct}%`, background: stressColor, boxShadow: `0 0 8px ${stressColor}` }}
          />
        </div>
      </div>

      <div className="vitalsGrid">
        <div className="vital">
          <span className="vitalKey">MOOD</span>
          <span className="vitalVal">{pulse.moodEmoji} {pulse.mood.toUpperCase()}</span>
        </div>
        <div className="vital">
          <span className="vitalKey">AQI</span>
          <span className="vitalVal">{pulse.airQuality.aqi}<span className="vitalUnit">/5</span></span>
        </div>
        <div className="vital">
          <span className="vitalKey">{transitLabel.toUpperCase()}</span>
          <span className={`vitalVal mta-${pulse.mta.severity}`}>{pulse.mta.severity.toUpperCase()}</span>
        </div>
        <div className="vital">
          <span className="vitalKey">TEMP</span>
          <span className="vitalVal">{pulse.weather.temp}<span className="vitalUnit">°{tempUnit}</span></span>
        </div>
      </div>

      <button
        className="perspectiveToggle"
        onClick={onOpenPerspective}
        aria-label="Open Neural Perspective"
      >
        NEURAL_ANALYSIS
      </button>

      <button
        className="themeToggleItem"
        onClick={onToggleTheme}
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <style>{`
        .vitalsBar {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 12px 20px;
          border: 1px solid var(--panel-border);
          border-radius: 10px;
          background: var(--panel-strong);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          position: sticky;
          top: 18px;
          z-index: 10;
          backdrop-filter: blur(16px);
          flex-wrap: wrap;
        }

        .brandBlock { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .brandLogo { color: var(--accent); display: flex; align-items: center; }
        .brandTitle { letter-spacing: 0.32em; font-weight: 700; font-size: 0.82rem; color: var(--text); }
        .brandPulse {
          width: 6px; height: 6px; border-radius: 50%;
          background: #00ff9d;
          animation: brandPulse 1.8s ease-in-out infinite;
          margin-left: 2px;
        }
        @keyframes brandPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--accent-glow); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 6px rgba(0,0,0,0); }
        }

        .citySelectorSlot { display: flex; align-items: center; flex-shrink: 0; }

        .themeToggleItem {
          background: var(--panel);
          border: 1px solid var(--panel-border);
          color: var(--text);
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .themeToggleItem:hover { background: var(--accent); color: var(--bg); transform: translateY(-1px); }

        .perspectiveToggle {
          background: var(--accent);
          color: var(--bg);
          border: none;
          padding: 8px 14px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .perspectiveToggle:hover { filter: brightness(1.1); box-shadow: 0 0 15px var(--accent-glow); transform: translateY(-1px); }

        .stressBlock { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; min-width: 140px; }
        .stressLabel { display: flex; align-items: baseline; gap: 6px; }
        .stressPill { font-size: 0.6rem; letter-spacing: 0.14em; font-weight: 700; padding: 2px 8px; border-radius: 3px; border: 1px solid currentColor; }
        .stressPill.good   { color: #00ff9d; border-color: rgba(0,255,157,0.3); }
        .stressPill.warn   { color: #ffb800; border-color: rgba(255,184,0,0.3); }
        .stressPill.danger { color: #ff3366; border-color: rgba(255,51,102,0.3); }
        .stressNum { font-size: 1.1rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
        .stressOf { font-size: 0.7rem; color: var(--muted); }
        .stressTrack { height: 2px; background: rgba(255,255,255,0.08); border-radius: 1px; overflow: hidden; }
        .stressFill { height: 100%; border-radius: 1px; transition: width 1s ease, background 0.5s ease, box-shadow 0.5s ease; }

        .vitalsGrid { display: flex; gap: 20px; flex-wrap: wrap; margin-left: auto; }
        .vital { display: flex; flex-direction: column; gap: 2px; align-items: flex-end; }
        .vitalKey { font-size: 0.58rem; letter-spacing: 0.16em; color: var(--muted); font-weight: 600; }
        .vitalVal { font-size: 0.82rem; font-weight: 700; color: var(--text); letter-spacing: 0.04em; }
        .vitalUnit { font-size: 0.65rem; color: var(--muted); font-weight: 400; }

        .mta-good   { color: #00ff9d; }
        .mta-minor  { color: #ffb800; }
        .mta-major  { color: #ff3366; }
        .mta-severe { color: #ff3366; }
      `}</style>
    </header>
  );
}
