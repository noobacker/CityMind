'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

import type { FeatureCollection, Point } from 'geojson';
import { BOROUGH_LABELS, NEIGHBORHOODS } from '@/lib/constants/neighborhoods';
import type { CityPulse, ForecastPulse } from '@/lib/types';

interface CityMapProps {
  pulse: CityPulse;
  theme: 'dark' | 'light';
  highlightedNeighborhoods: string[];
  onSelectNeighborhood: (name: string) => void;
  forecastPulse?: ForecastPulse | null;
  showForecast?: boolean;
  onToggleForecast?: () => void;
  onSandboxToggle?: (active: boolean) => void;
  onSandboxImpact?: (msg: string) => void;
}

interface NeighborhoodFeatureProps {
  name: string;
  borough: string;
  stress: number;
  topComplaint: string;
  topIssues: string[];
  anomaly: boolean;
  icon: string;
}

const ISSUE_ICONS: Record<string, string> = {
  'HEAT/HOT WATER': '🌡️',
  'Noise - Residential': '🔊',
  'Noise - Street/Sidewalk': '📣',
  'Noise - Commercial': '🎺',
  'Illegal Parking': '🚗',
  'Blocked Driveway': '🚫',
  'Water System': '💧',
  'Rodent': '🐀',
  'Dirty Conditions': '🧹',
  'Homeless Encampment': '⛺',
  'Sidewalk Condition': '🚶',
  'default': '⚠️'
};

const RESOURCES = [
  { id: 'police', label: 'NYPD Unit', icon: '👮', reduction: 12, affinity: ['Noise - Street/Sidewalk', 'Illegal Parking', 'Gun Violence', 'Blocked Driveway'] },
  { id: 'sanitation', label: 'DSNY Crew', icon: '🧹', reduction: 18, affinity: ['Dirty Conditions', 'Rodent', 'Trash', 'Sidewalk Condition'] },
  { id: 'emt', label: 'EMS Response', icon: '🚑', reduction: 22, affinity: ['Homeless Encampment', 'Heatwave', 'Public Safety'] },
  { id: 'mta', label: 'MTA Repair', icon: '🛠️', reduction: 15, affinity: ['Water System', 'Street Light Condition', 'MTA Disruptions', 'Bridge Condition'] },
];


function buildNeighborhoodGeojson(pulse: CityPulse): FeatureCollection<Point, NeighborhoodFeatureProps> {
  return {
    type: 'FeatureCollection',
    features: NEIGHBORHOODS.map((seed) => {
      const neighborhood = pulse.neighborhoods[seed.name] ?? {
        stress: 0,
        topComplaint: 'No live data yet',
        anomaly: false,
      };

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [seed.lon, seed.lat],
        },
        properties: {
          name: seed.name,
          borough: BOROUGH_LABELS[seed.borough],
          stress: neighborhood.stress,
          topComplaint: neighborhood.topComplaint,
          topIssues: neighborhood.topIssues ?? [],
          anomaly: neighborhood.anomaly,
          icon: neighborhood.socialVibe ? '🌟' : (ISSUE_ICONS[neighborhood.topComplaint] || ISSUE_ICONS['default']),
        },
      };
    }),
  };
}

export function CityMap({ pulse, theme, highlightedNeighborhoods, onSelectNeighborhood, forecastPulse, showForecast = false, onToggleForecast, onSandboxToggle, onSandboxImpact }: CityMapProps) {
  const [isSandbox, setIsSandbox] = useState(false);
  
  useEffect(() => {
    if (onSandboxToggle) onSandboxToggle(isSandbox);
  }, [isSandbox, onSandboxToggle]);

  const [sandboxPulse, setSandboxPulse] = useState<CityPulse>(pulse);
  const [units, setUnits] = useState<{ id: string; type: string; lon: number; lat: number }[]>([]);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  const activePulse = isSandbox ? sandboxPulse : (showForecast && forecastPulse ? forecastPulse : pulse);

  useEffect(() => {
    if (isSandbox) {
      const newPulse = JSON.parse(JSON.stringify(pulse)) as CityPulse;
      let totalImpact = 0;
      
      units.forEach(unit => {
        const resource = RESOURCES.find(r => r.id === unit.type);
        if (!resource) return;

        NEIGHBORHOODS.forEach(n => {
          const dx = n.lon - unit.lon;
          const dy = n.lat - unit.lat;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 0.12) { // Increased radius for broad impact (approx 7-8 miles)
            const neighbor = newPulse.neighborhoods[n.name];
            if (neighbor) {
              const hasAffinity = resource.affinity.some(a => a.toLowerCase().includes(neighbor.topComplaint.toLowerCase()));
              const multiplier = hasAffinity ? 1.8 : 0.6; // 80% bonus for matching resource to issue
              const distanceFactor = Math.max(0.2, 1 - (dist / 0.12)); // Closer = more impact
              
              const reduction = Math.round(resource.reduction * multiplier * distanceFactor);
              neighbor.stress = Math.max(2, neighbor.stress - reduction);
              totalImpact += reduction;
            }
          }
        });
      });

      
      if (totalImpact > 0 && onSandboxImpact) {
        onSandboxImpact(`PROJECTED RECOVERY: ${totalImpact} points of systemic stress stabilized.`);
      }
      setSandboxPulse(newPulse);
    } else {
      setSandboxPulse(pulse);
    }
  }, [units, isSandbox, pulse]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const sortedNeighborhoods = useMemo(
    () =>
      [...NEIGHBORHOODS].sort((a, b) => {
        const left = activePulse.neighborhoods[a.name]?.stress ?? 0;
        const right = activePulse.neighborhoods[b.name]?.stress ?? 0;
        return right - left;
      }),
    [activePulse],
  );

  const fallbackNeighborhood = {
    stress: 0,
    topComplaint: 'No live data yet',
    topIssues: [],
    anomaly: false,
  };

  useEffect(() => {
    if (!mapToken || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v10',
      center: [-73.94, 40.72],
      zoom: 10.2,
      pitch: 20,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('neighborhood-points', {
        type: 'geojson',
        data: buildNeighborhoodGeojson(activePulse),
      });

      map.addLayer({
        id: 'neighborhood-circles',
        type: 'circle',
        source: 'neighborhood-points',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'stress'], 0, 6, 30, 10, 60, 14, 100, 18],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'stress'],
            0, '#00ff9d',
            35, '#ffcc00',
            60, '#ff6600',
            80, '#ff3b3b',
            100, '#880000',
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': showForecast ? '#ffdd57' : '#9dffd0',
        },
      });

      map.addLayer({
        id: 'neighborhood-labels',
        type: 'symbol',
        source: 'neighborhood-points',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.2],
        },
        paint: {
          'text-color': theme === 'dark' ? '#b8ffd6' : '#2c3e50',
          'text-halo-color': theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
          'text-halo-width': 1,
        },
      });

      map.addLayer({
        id: 'neighborhood-icons',
        type: 'symbol',
        source: 'neighborhood-points',
        layout: {
          'text-field': ['get', 'icon'],
          'text-size': 16,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.6],
        },
      });

      map.on('click', 'neighborhood-circles', (e) => {
        const feature = e.features?.[0];
        if (feature) {
          const name = feature.properties?.name;
          if (name) {
            onSelectNeighborhood(name);
            document.getElementById(`neighborhood-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });

      map.on('mouseenter', 'neighborhood-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'neighborhood-circles', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapToken, pulse, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('neighborhood-points') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(buildNeighborhoodGeojson(activePulse));
    if (map.getLayer('neighborhood-circles')) {
      map.setPaintProperty('neighborhood-circles', 'circle-stroke-color', showForecast ? '#ffdd57' : '#9dffd0');
    }
  }, [activePulse, showForecast]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || highlightedNeighborhoods.length === 0) return;
    const firstMention = highlightedNeighborhoods[0];
    const target = NEIGHBORHOODS.find((n) => n.name === firstMention);
    if (!target) return;

    map.flyTo({
      center: [target.lon, target.lat],
      zoom: 12.5,
      speed: 0.8,
      curve: 1.4,
      essential: true,
    });
  }, [highlightedNeighborhoods]);

  return (
    <section className="mapShell" aria-label="Live city pulse map">
      <div className="mapHeader">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{isSandbox ? 'SANDBOX_MODE' : (showForecast ? 'T+24H FORECAST' : 'LIVE CITY MAP')}</span>
          <button 
            className={`sandboxToggle ${isSandbox ? 'active' : ''}`}
            onClick={() => {
              const next = !isSandbox;
              setIsSandbox(next);
              if (onSandboxToggle) onSandboxToggle(next);
            }}
            style={{
              fontSize: '0.6rem',
              padding: '2px 8px',
              borderRadius: '3px',
              border: isSandbox ? '1px solid #ccff00' : '1px solid rgba(255,255,255,0.2)',
              background: isSandbox ? 'rgba(204,255,0,0.15)' : 'transparent',
              color: isSandbox ? '#ccff00' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}
          >
            {isSandbox ? 'EXIT_SANDBOX' : 'ENTER_SANDBOX'}
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{activePulse.activeEvents[0] ?? 'Quiet skyline'}</span>
          {!isSandbox && onToggleForecast && (
            <button
              onClick={onToggleForecast}
              style={{
                fontSize: '0.6rem',
                padding: '2px 8px',
                borderRadius: '3px',
                border: showForecast ? '1px solid #ffdd57' : '1px solid var(--accent)',
                background: showForecast ? 'rgba(255,221,87,0.15)' : 'transparent',
                color: showForecast ? '#ffdd57' : 'var(--accent)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                fontWeight: 700,
              }}
            >
              {showForecast ? '◀ NOW' : 'T+24H ▶'}
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {mapToken ? <div ref={mapContainerRef} className="mapCanvas" /> : null}
        
        {isSandbox && (
          <div className="sandboxPalette">
            <div className="sandboxPaletteTitle">RESOURCE_PALETTE</div>
            <div className="sandboxPaletteGrid">
              {RESOURCES.map(r => (
                <button 
                  key={r.id}
                  className="resourceBtn"
                  onClick={() => {
                    if (!mapRef.current) return;
                    const center = mapRef.current.getCenter();
                    const id = Math.random().toString(36).substr(2, 9);
                    const newUnit = { id, type: r.id, lon: center.lng, lat: center.lat };
                    
                    const marker = new mapboxgl.Marker({ draggable: true, element: createResourceEl(r.icon) })
                      .setLngLat([newUnit.lon, newUnit.lat])
                      .addTo(mapRef.current);
                      
                    marker.on('dragend', () => {
                      const lngLat = marker.getLngLat();
                      setUnits(prev => prev.map(u => u.id === id ? { ...u, lon: lngLat.lng, lat: lngLat.lat } : u));
                    });

                    markersRef.current[id] = marker;
                    setUnits(prev => [...prev, newUnit]);
                  }}
                >
                  <span className="resourceIcon">{r.icon}</span>
                  <span className="resourceLabel">{r.label}</span>
                </button>
              ))}
            </div>
            {units.length > 0 && (
              <button 
                className="flushBtn"
                onClick={() => {
                  Object.values(markersRef.current).forEach(m => m.remove());
                  markersRef.current = {};
                  setUnits([]);
                }}
              >
                Flush Units
              </button>
            )}
          </div>
        )}
      </div>

      {!mapToken ? <div className="mapUnavailable">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env to enable the realtime map.</div> : null}
      <div className="mapGrid">
        {sortedNeighborhoods.map((seed) => {
          const neighborhood = activePulse.neighborhoods[seed.name] ?? fallbackNeighborhood;
          const isHighlighted = highlightedNeighborhoods.includes(seed.name);
          const stressClass = neighborhood.stress < 31 ? 'calm' : neighborhood.stress < 61 ? 'tense' : 'stressed';

          return (
            <article 
              key={seed.name} 
              id={`neighborhood-${seed.name}`}
              className={`neighborhoodCard ${stressClass} ${isHighlighted ? 'highlighted' : ''}`}
              onClick={() => onSelectNeighborhood(seed.name)}
            >
              <div className="neighborhoodName">{seed.name}</div>
              <div className="neighborhoodBorough">{BOROUGH_LABELS[seed.borough]}</div>
              <div className="neighborhoodMetrics">
                <span>{neighborhood.stress}/100</span>
                <span>{neighborhood.topComplaint}</span>
              </div>
              <div className="hoverIssues">
                {(neighborhood.topIssues || []).map((issue, idx) => (
                  <div key={idx} className="hoverIssueItem">• {issue}</div>
                ))}
              </div>

              {neighborhood.anomaly && !showForecast ? <span className="anomalyFlag">ANOMALY</span> : null}
              {showForecast && neighborhood.forecastReason ? (
                <span 
                  className="anomalyFlag" 
                  style={{ 
                    background: 'rgba(255,221,87,0.15)', 
                    color: '#ffdd57', 
                    borderColor: 'rgba(255,221,87,0.4)',
                    fontSize: '0.45rem',
                    letterSpacing: '0.15em'
                  }}
                >
                  {neighborhood.forecastReason}
                </span>
              ) : (showForecast ? (
                <span className="anomalyFlag" style={{ background: 'rgba(255,221,87,0.15)', color: '#ffdd57', borderColor: 'rgba(255,221,87,0.4)' }}>FORECAST</span>
              ) : null)}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function createResourceEl(icon: string) {
  const el = document.createElement('div');
  el.className = 'sandboxMarker';
  el.innerHTML = `<span>${icon}</span>`;
  return el;
}