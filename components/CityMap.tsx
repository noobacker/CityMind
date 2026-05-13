'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Link from 'next/link';

import type { FeatureCollection, Point } from 'geojson';
import type { CityPulse, ForecastPulse, NeighborhoodPulse } from '@/lib/types';

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
  'Power Outage': '⚡',
  'Air Quality': '🌫️',
  'Construction Noise': '🏗️',
  'Public Safety': '🛡️',
  'Sewer': '🕳️',
  'Garbage Collection': '🗑️',
  'Traffic Signal': '🚦',
  'default': '⚠️',
};

const RESOURCES = [
  { id: 'police', label: 'Police Unit', icon: '👮', reduction: 12, affinity: ['Noise - Street/Sidewalk', 'Illegal Parking', 'Public Safety', 'Blocked Driveway'] },
  { id: 'sanitation', label: 'Sanitation', icon: '🧹', reduction: 18, affinity: ['Dirty Conditions', 'Rodent', 'Garbage Collection', 'Sidewalk Condition'] },
  { id: 'emt', label: 'EMS Response', icon: '🚑', reduction: 22, affinity: ['Homeless Encampment', 'Heatwave', 'Public Safety'] },
  { id: 'transit', label: 'Transit Repair', icon: '🛠️', reduction: 15, affinity: ['Water System', 'Street Light Condition', 'Power Outage', 'Traffic Signal'] },
  { id: 'energy', label: 'Energy Grid', icon: '⚡', reduction: 20, affinity: ['Power Outage', 'Heatwave', 'Elevator', 'Electric'] },
  { id: 'eco', label: 'Eco-Scrubber', icon: '🌫️', reduction: 25, affinity: ['Air Quality', 'Smoke', 'Odor', 'Asbestos'] },
  { id: 'social', label: 'Support Van', icon: '🫂', reduction: 15, affinity: ['Homeless Encampment', 'Mental Health', 'Noise - Residential'] },
];

function pulseSeeds(pulse: CityPulse): NeighborhoodPulse[] {
  return Object.values(pulse.neighborhoods);
}

function buildNeighborhoodGeojson(pulse: CityPulse): FeatureCollection<Point, NeighborhoodFeatureProps> {
  const labels = pulse.boroughLabels || {};
  return {
    type: 'FeatureCollection',
    features: pulseSeeds(pulse).map((n) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [n.lon, n.lat],
      },
      properties: {
        name: n.name,
        borough: labels[n.borough] ?? n.borough,
        stress: n.stress,
        topComplaint: n.topComplaint,
        topIssues: n.topIssues ?? [],
        anomaly: n.anomaly,
        icon: n.socialVibe ? '🌟' : (ISSUE_ICONS[n.topComplaint] || ISSUE_ICONS['default']),
      },
    })),
  };
}

function cityCenter(pulse: CityPulse): [number, number] {
  if (pulse.cityIdentity?.lat && pulse.cityIdentity?.lon) {
    return [pulse.cityIdentity.lon, pulse.cityIdentity.lat];
  }
  const list = pulseSeeds(pulse);
  if (list.length === 0) return [-73.94, 40.72];
  const lat = list.reduce((s, n) => s + n.lat, 0) / list.length;
  const lon = list.reduce((s, n) => s + n.lon, 0) / list.length;
  return [lon, lat];
}


export function CityMap({
  pulse,
  theme,
  highlightedNeighborhoods,
  onSelectNeighborhood,
  forecastPulse,
  showForecast = false,
  onToggleForecast,
  onSandboxToggle,
  onSandboxImpact,
}: CityMapProps) {
  const [isSandbox, setIsSandbox] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [sandboxPulse, setSandboxPulse] = useState<CityPulse>(pulse);
  const [units, setUnits] = useState<{ id: string; type: string; lon: number; lat: number }[]>([]);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const pulseRef = useRef(pulse);
  const isInteractingRef = useRef(false);

  const resetView = () => {
    if (!mapRef.current) return;
    const isWorld = pulse.cityId === 'world';
    const [lon, lat] = cityCenter(pulse);
    mapRef.current.flyTo({
      center: [lon, lat],
      zoom: isWorld ? 1.5 : 10.4,
      pitch: isWorld ? 0 : 20,
      bearing: 0,
      essential: true
    });
  };

  useEffect(() => {
    pulseRef.current = pulse;
  }, [pulse]);

  useEffect(() => {
    if (onSandboxToggle) onSandboxToggle(isSandbox);
  }, [isSandbox, onSandboxToggle]);

  const activePulse = isSandbox ? sandboxPulse : (showForecast && forecastPulse ? forecastPulse : pulse);
  const labels = activePulse.boroughLabels || {};

  useEffect(() => {
    if (isSandbox) {
      const newPulse = JSON.parse(JSON.stringify(pulse)) as CityPulse;
      let totalImpact = 0;
      const all = pulseSeeds(pulse);

      units.forEach((unit) => {
        const resource = RESOURCES.find((r) => r.id === unit.type);
        if (!resource) return;

        all.forEach((n) => {
          const dx = n.lon - unit.lon;
          const dy = n.lat - unit.lat;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.12) {
            const target = newPulse.neighborhoods[n.name];
            if (target) {
              const hasAffinity = resource.affinity.some((a) => a.toLowerCase().includes(target.topComplaint.toLowerCase()));
              const multiplier = hasAffinity ? 1.8 : 0.6;
              const distanceFactor = Math.max(0.2, 1 - dist / 0.12);
              const reduction = Math.round(resource.reduction * multiplier * distanceFactor);
              target.stress = Math.max(2, target.stress - reduction);
              totalImpact += reduction;

              // Track impact source
              if (!target.socialVibe) target.socialVibe = ''; // Reuse socialVibe for impact display in sandbox
              const impactInfo = `${resource.icon} ${resource.label} (-${reduction})`;
              if (!target.socialVibe.includes(impactInfo)) {
                target.socialVibe = target.socialVibe ? `${target.socialVibe}, ${impactInfo}` : impactInfo;
              }
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

  useEffect(() => {
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    setUnits([]);
  }, [pulse.cityId]);

  useEffect(() => {
    if (!isSandbox) {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      setUnits([]);
    }
  }, [isSandbox]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const sortedNeighborhoods = useMemo(
    () => pulseSeeds(activePulse).sort((a, b) => b.stress - a.stress),
    [activePulse],
  );

  useEffect(() => {
    if (!mapToken || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapToken;
    const isWorld = pulse.cityId === 'world';
    const [lon, lat] = cityCenter(pulse);
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v10',
      center: [lon, lat],
      zoom: isWorld ? 1.5 : 10.4,
      pitch: isWorld ? 0 : 20,
      projection: 'globe' as any,
      attributionControl: false,
    });



    mapRef.current = map;

      map.on('style.load', () => {
        map.setFog({
          color: theme === 'dark' ? 'rgb(10, 10, 10)' : 'rgb(240, 240, 240)',
          'high-color': theme === 'dark' ? 'rgb(20, 20, 20)' : 'rgb(255, 255, 255)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(0, 0, 0)',
          'star-intensity': 0.15
        });

        if (isWorld) {
          let lastTime = 0;
          const rotate = (time: number) => {
            if (!mapRef.current || pulseRef.current.cityId !== 'world' || isInteractingRef.current) {
              return;
            }
            const dt = time - lastTime;
            lastTime = time;
            const center = mapRef.current.getCenter();
            center.lng += 0.005 * (dt || 16);
            mapRef.current.setCenter(center);
            requestAnimationFrame(rotate);
          };
          requestAnimationFrame(rotate);
        }
      });

      map.on('movestart', () => {
        isInteractingRef.current = true;
      });

      map.on('mousedown', () => {
        isInteractingRef.current = true;
      });

      map.on('touchstart', () => {
        isInteractingRef.current = true;
      });

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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapToken, theme]);

  // When the city changes, recenter and update the map data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const isWorld = pulse.cityId === 'world';
    const [lon, lat] = cityCenter(pulse);
    
    if (isWorld) {
      map.flyTo({ center: [lon, lat], zoom: 1.5, pitch: 0, speed: 1.2, essential: true });
    } else {
      map.flyTo({ center: [lon, lat], zoom: 10.4, pitch: 20, speed: 1.2, curve: 1.4, essential: true });
    }
  }, [pulse.cityId]);

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
    const target = pulseSeeds(activePulse).find((n) => n.name === firstMention);
    if (!target) return;

    map.flyTo({
      center: [target.lon, target.lat],
      zoom: 12.5,
      speed: 0.8,
      curve: 1.4,
      essential: true,
    });
  }, [highlightedNeighborhoods, activePulse]);

  return (
    <section className="mapShell" aria-label="Live city pulse map">
      <div className="mapHeader">
        <div className="headerLeft">
          <span className="gridStatus">
            {isSandbox ? 'SIMULATION_ENVIRONMENT' : (showForecast ? 'PREDICTIVE_PROJECTION' : 'NEURAL_GEOSPATIAL_GRID')}
          </span>
          <button
            className={`mapActionBtn sandboxToggle ${isSandbox ? 'active' : ''}`}
            onClick={() => {
              const next = !isSandbox;
              setIsSandbox(next);
              if (onSandboxToggle) onSandboxToggle(next);
            }}
          >
            {isSandbox ? 'CLOSE_SIMULATION' : 'OPEN_SANDBOX'}
          </button>
        </div>

        <div className="headerRight">
          <span className="eventTicker">{activePulse.activeEvents[0] ?? 'Neural Synchrony Active'}</span>
          
          <button className="mapActionBtn resetBtn" onClick={resetView}>
            RESET_VIEW
          </button>

          {!isSandbox && onToggleForecast && (
            <button
              className={`mapActionBtn forecastBtn ${showForecast ? 'active' : ''}`}
              onClick={onToggleForecast}
            >
              {showForecast ? '◀ REALTIME' : 'FORECAST ▶'}
            </button>
          )}
        </div>
      </div>

      <div className={`mapCanvasContainer ${isSandbox ? 'sandboxActive' : ''}`}>
        {mapToken ? <div ref={mapContainerRef} className="mapCanvas" /> : null}

        {isSandbox && (
          <aside className="sandboxSidebar">
            <div className="sidebarHeader">
              <div className="sidebarTitle">NEURAL_COMMAND</div>
              <button className="infoBtn" onClick={() => setShowInfo(!showInfo)}>ⓘ INFO</button>
            </div>

            {showInfo && (
              <div className="sandboxInfoBlock">
                <div className="infoSection">
                  <strong>Affinity (1.8x)</strong>: Matching specialties provides a massive boost.
                </div>
                <div className="infoSection">
                  <strong>Proximity</strong>: Impact fades toward the 12km radius edge.
                </div>
                <div className="infoSection">
                  <strong>General (0.6x)</strong>: Baseline stabilization.
                </div>
              </div>
            )}

            <div className="sidebarScroll">
              <div className="resourceGrid">
                {RESOURCES.map((r) => (
                  <button
                    key={r.id}
                    className="sidebarResourceBtn"
                    onClick={() => {
                      if (!mapRef.current) return;
                      let [baseLon, baseLat] = cityCenter(pulse);
                      
                      if (highlightedNeighborhoods.length > 0) {
                        const target = pulseSeeds(pulse).find((n) => n.name === highlightedNeighborhoods[0]);
                        if (target) {
                          baseLon = target.lon;
                          baseLat = target.lat;
                        }
                      }

                      const lon = baseLon + (Math.random() - 0.5) * 0.01;
                      const lat = baseLat + (Math.random() - 0.5) * 0.01;
                      const id = Math.random().toString(36).substr(2, 9);
                      const newUnit = { id, type: r.id, lon, lat };

                      const marker = new mapboxgl.Marker({ draggable: true, element: createResourceEl(r.icon) })
                        .setLngLat([newUnit.lon, newUnit.lat])
                        .addTo(mapRef.current);

                      marker.on('dragend', () => {
                        const lngLat = marker.getLngLat();
                        setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, lon: lngLat.lng, lat: lngLat.lat } : u)));
                      });

                      markersRef.current[id] = marker;
                      setUnits((prev) => [...prev, newUnit]);
                    }}
                  >
                    <span className="resIcon">{r.icon}</span>
                    <div className="resMeta">
                      <span className="resName">{r.label}</span>
                      <span className="resPower">+{r.reduction} BASE_EFF</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {units.length > 0 && (
              <div className="sidebarFooter">
                <button
                  className="sidebarFlushBtn"
                  onClick={() => {
                    Object.values(markersRef.current).forEach((m) => m.remove());
                    markersRef.current = {};
                    setUnits([]);
                  }}
                >
                  FLUSH_ALL_UNITS ({units.length})
                </button>
              </div>
            )}
          </aside>
        )}

        {sortedNeighborhoods.length === 0 && (
          <div className="mapLoadingOverlay">
            <div className="cyberGrid" />
            <div className="dataFragments">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`fragment f${i+1}`}>0101_SYNC</div>
              ))}
            </div>
            
            <div className="loadingContent">
              <div className="scanningHud">
                <div className="hudRing ring1" />
                <div className="hudRing ring2" />
                <div className="hudRing ring3" />
                <div className="hudCenter">
                  <div className="pulseCore" />
                </div>
              </div>

              <div className="loadingBrand">
                <span className="brandText">NEURAL_GRID_SYNC</span>
                <span className="brandDecor">[0x4F_CITY]</span>
              </div>
              
              <div className="loadingStatus">
                ESTABLISHING_GEOSPATIAL_QUORUM...
              </div>

              <div className="loadingProgressBar">
                <div className="loadingProgressFill" />
                <div className="progressGlow" />
              </div>

              <div className="loadingMeta">
                SECURE_LINK // 99.8% STABILITY
              </div>
            </div>
          </div>
        )}
      </div>

      {!mapToken ? <div className="mapUnavailable">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env to enable the realtime map.</div> : null}
      <div className="mapGrid">
        {sortedNeighborhoods.map((n) => {
          const isHighlighted = highlightedNeighborhoods.includes(n.name);
          const stressClass = n.stress < 31 ? 'calm' : n.stress < 61 ? 'tense' : 'stressed';
          const districtLabel = labels[n.borough] ?? n.borough;
          
          const original = pulse.neighborhoods[n.name];
          const isStabilized = isSandbox && original && original.stress > n.stress;

          return (
            <article
              key={n.name}
              id={`neighborhood-${n.name}`}
              className={`neighborhoodCard ${stressClass} ${isHighlighted ? 'highlighted' : ''} ${isStabilized ? 'stabilized' : ''}`}
              onClick={() => onSelectNeighborhood(n.name)}
            >
              <div className="neighborhoodName">{n.name}</div>
              <div className="neighborhoodBorough">{districtLabel}</div>
              
              {isStabilized && (
                <div className="stabilizationLogic">
                  <div className="deploymentStatus">AFTER UNIT DEPLOYMENT</div>
                  <div className="impactBreakdown">
                    {n.socialVibe?.split(', ').map((imp, i) => (
                      <span key={i} className="impactSource">{imp}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="neighborhoodMetrics">
                <span>
                  {n.stress}/100
                  {isStabilized && (
                    <span className="stressEarlier"> (earlier: {original.stress})</span>
                  )}
                </span>
                <span>{n.topComplaint}</span>
              </div>
              
              <div className="hoverIssues">
                {(n.topIssues || []).map((issue, idx) => (
                  <div key={idx} className="hoverIssueItem">• {issue}</div>
                ))}
              </div>

              {n.anomaly && !showForecast ? <span className="anomalyFlag">ANOMALY</span> : null}
              {showForecast && n.forecastReason ? (
                <span
                  className="anomalyFlag"
                  style={{
                    background: 'rgba(255,221,87,0.15)',
                    color: '#ffdd57',
                    borderColor: 'rgba(255,221,87,0.4)',
                    fontSize: '0.45rem',
                    letterSpacing: '0.15em',
                  }}
                >
                  {n.forecastReason}
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
  el.innerHTML = `<div class="sandboxMarkerInner"><span>${icon}</span></div>`;
  return el;
}
