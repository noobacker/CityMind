'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCity, type ActiveCity } from './CityProvider';

interface SearchHit {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  lat: number;
  lon: number;
  source: 'catalog' | 'global';
  isCustom?: boolean;
  displayName?: string;
}

interface CitySelectorProps {
  variant?: 'pill' | 'button' | 'minimal';
}

const POPULAR_IDS = ['nyc', 'london', 'tokyo', 'paris', 'mumbai', 'singapore', 'dubai', 'sydney', 'sao_paulo', 'berlin'];

export const CitySelector = React.memo(({ variant = 'pill' }: CitySelectorProps) => {
  const { city, setCity, recents } = useCity();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaults, setDefaults] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    function onClickAway(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickAway);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickAway);
    };
  }, [open]);


  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    fetch('/api/cities')
      .then((r) => r.json())
      .then((data: { cities: SearchHit[] }) => {
        const arr: SearchHit[] = (data.cities || []).map((c) => ({ ...c, source: 'catalog' }));
        setDefaults(arr);
      })
      .catch(() => null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/cities/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data: { results: SearchHit[] }) => setResults(data.results || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 150);
  }, [query, open]);


  function selectHit(hit: SearchHit) {
    const next: ActiveCity = {
      id: hit.id,
      name: hit.name,
      country: hit.country,
      countryCode: hit.countryCode,
      flag: hit.flag,
      lat: hit.lat,
      lon: hit.lon,
      isCustom: hit.isCustom || hit.id.startsWith('custom_'),
      displayName: hit.displayName,
    };
    setCity(next);
    setOpen(false);
    setQuery(hit.name);
    setResults([]);
    inputRef.current?.blur();
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    
    try {
      const res = await fetch(`/api/cities/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('[CitySearch] Error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }


  const popularDefaults = defaults.filter((c) => POPULAR_IDS.includes(c.id));
  const otherCatalog = defaults.filter((c) => !POPULAR_IDS.includes(c.id));
  const showResults = query.trim().length > 0;

  const triggerLabel = (
    <span className="cs-trigger-label">
      <span className="cs-flag">{city.flag}</span>
      <span className="cs-name">{city.name}</span>
      {city.isCustom && <span className="cs-tag">CUSTOM</span>}
      <span className="cs-shortcut">⌘K</span>
    </span>
  );

  return (
    <div className="cs-inline-container" ref={containerRef}>
      <div className={`cs-search-wrap ${open ? 'active' : ''}`}>
        <div className="cs-input-container">
          <input
            ref={inputRef}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (results[0]) {
                  selectHit(results[0]);
                } else {
                  handleSearch();
                }
              } else if (e.key === 'Tab' && results[0]) {
                e.preventDefault();
                selectHit(results[0]);
              } else if (e.key === 'Escape') {
                setOpen(false);
                inputRef.current?.blur();
              }
            }}
            placeholder={city.name || "Search city…"}
            className="cs-search-input"
          />
          {query && results[0] && results[0].name.toLowerCase().startsWith(query.toLowerCase()) && (
            <span className="cs-ghost-text">
              <span className="cs-ghost-match">{query}</span>
              {results[0].name.slice(query.length)}
            </span>
          )}
        </div>
        <button 
          type="button" 
          className="cs-search-btn" 
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? <span className="cs-loading-spinner">◌</span> : <span className="cs-search-icon">⌕</span>}
        </button>
      </div>

      {open && (
        <div className="cs-dropdown-portal">
          <div className="cs-body">
            {loading ? (
              <div className="cs-status-msg cs-scanning">
                <div className="cs-loader">
                  <span className="cs-loader-dot" />
                  <span className="cs-loader-dot" />
                  <span className="cs-loader-dot" />
                </div>
                <span>Scanning…</span>
              </div>
            ) : results.length > 0 && query.trim().length > 0 ? (
              <div className="cs-dropdown">
                {results.map((hit, idx) => (
                  <div 
                    key={`${hit.id}-${idx}`} 
                    className={`cs-dropdown-item ${idx === 0 ? 'active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur
                      selectHit(hit);
                    }}
                  >
                    <span className="cs-item-flag">{hit.flag}</span>
                    <div className="cs-item-info">
                      <span className="cs-item-name">{hit.name}</span>
                      <span className="cs-item-meta">{hit.displayName || hit.country}</span>
                    </div>
                    {idx === 0 && <span className="cs-item-hint">↵</span>}
                  </div>
                ))}
              </div>
            ) : query.trim().length > 0 ? (
              <div className="cs-status-msg">
                <span className="cs-status-icon">○</span>
                No results for "{query}"
              </div>
            ) : (
              <div className="cs-status-msg">
                <span className="cs-status-icon">●</span>
                Type to change neural node
              </div>
            )}
          </div>
          <div className="cs-hint">
            <kbd>↑↓</kbd> navigate <kbd>↵</kbd> select <kbd>esc</kbd> close
          </div>
        </div>
      )}

      <style>{`
        .cs-inline-container {
          position: relative;
          z-index: 1000;
          min-width: 220px;
        }
        .cs-search-wrap {
          display: flex;
          align-items: center;
          gap: 0;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 4px 4px 4px 12px;
          transition: all 0.2s ease;
        }
        .cs-search-wrap.active {
          border-color: var(--accent);
          background: rgba(204,255,0,0.03);
          box-shadow: 0 0 15px rgba(204,255,0,0.1);
        }
        .cs-input-container {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }
        .cs-search-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 0.85rem;
          font-family: var(--font-mono, monospace);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 700;
          position: relative;
          z-index: 2;
        }
        .cs-search-input::placeholder { color: var(--accent); opacity: 0.8; }
        .cs-ghost-text {
          position: absolute;
          left: 0;
          color: rgba(255,255,255,0.2);
          font-family: var(--font-mono, monospace);
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          pointer-events: none;
          z-index: 1;
          white-space: pre;
        }
        .cs-ghost-match { opacity: 0; }
        .cs-search-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.3);
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .cs-search-btn:hover { color: var(--accent); }
        .cs-dropdown-portal {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 460px;
          background: #0d1117;
          border: 1px solid rgba(204,255,0,0.2);
          border-radius: 12px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.6);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .cs-body {
          max-height: 380px;
          overflow-y: auto;
          background: rgba(255,255,255,0.01);
        }
        .cs-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: all 0.1s ease;
        }
        .cs-dropdown-item:hover, .cs-dropdown-item.active {
          background: rgba(204,255,0,0.08);
          border-left-color: var(--accent);
        }
        .cs-item-flag { font-size: 1.1rem; }
        .cs-item-info { display: flex; flex-direction: column; flex: 1; }
        .cs-item-name { color: #fff; font-weight: 700; font-size: 0.85rem; }
        .cs-item-meta { 
          color: rgba(255,255,255,0.3); 
          font-size: 0.6rem; 
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cs-status-msg {
          padding: 32px 16px;
          text-align: center;
          color: rgba(255,255,255,0.3);
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .cs-hint {
          padding: 8px 16px;
          background: rgba(255,255,255,0.03);
          border-top: 1px solid rgba(255,255,255,0.06);
          font-size: 0.55rem;
          color: rgba(255,255,255,0.3);
          display: flex;
          gap: 12px;
        }
        .cs-hint kbd {
          background: rgba(255,255,255,0.08);
          padding: 1px 4px;
          border-radius: 3px;
          color: rgba(255,255,255,0.6);
        }
      `}</style>
    </div>
  );
}


function CitySection({
  title,
  hits,
  onSelect,
  loading,
  emptyText,
}: {
  title: string;
  hits: SearchHit[];
  onSelect: (hit: SearchHit) => void;
  loading?: boolean;
  emptyText?: string;
}) {
  if (hits.length === 0) {
    if (loading) return null;
    if (emptyText) {
      return (
        <div className="cs-section">
          <div className="cs-section-title">{title}</div>
          <div className="cs-empty">{emptyText}</div>
        </div>
      );
    }
    return null;
  }
  return (
    <div className="cs-section">
      <div className="cs-section-title">{title}</div>
      {hits.map((hit) => (
        <div key={`${hit.id}-${hit.lat}-${hit.lon}`} className="cs-row" onClick={() => onSelect(hit)}>
          <div className="cs-row-flag">{hit.flag}</div>
          <div className="cs-row-info">
            <div className="cs-row-name">{hit.name}</div>
            <div className="cs-row-meta">{hit.displayName ?? hit.country} · {hit.lat.toFixed(2)}, {hit.lon.toFixed(2)}</div>
          </div>
          <span className={`cs-row-source ${hit.source}`}>{hit.source === 'catalog' ? 'CATALOG' : 'GLOBAL'}</span>
        </div>
      ))}
    </div>
  );
});

CitySelector.displayName = 'CitySelector';
