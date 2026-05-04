'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface ActiveCity {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  lat: number;
  lon: number;
  isCustom?: boolean;
  displayName?: string;
}

interface CityContextValue {
  city: ActiveCity;
  setCity: (city: ActiveCity) => void;
  recents: ActiveCity[];
  apiQuery: string;
  isReady: boolean;
}

const WORLD_DEFAULT: ActiveCity = {
  id: 'world',
  name: 'Global Network',
  country: 'Nexus',
  countryCode: 'XX',
  flag: '🌍',
  lat: 20,
  lon: 0,
};


const CityContext = createContext<CityContextValue | null>(null);

const STORAGE_KEY = 'citymind_active_city';
const RECENTS_KEY = 'citymind_recent_cities';
const MAX_RECENTS = 8;

function readStoredCity(): ActiveCity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveCity;
    if (parsed?.id && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon)) return parsed;
  } catch {}
  return null;
}

function readRecents(): ActiveCity[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActiveCity[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function readUrlCity(): ActiveCity | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('city');
  if (!id) return null;

  const lat = parseFloat(params.get('lat') || '');
  const lon = parseFloat(params.get('lon') || '');
  const name = params.get('name') || id;

  if (id.startsWith('custom_') && Number.isFinite(lat) && Number.isFinite(lon)) {
    return {
      id,
      name,
      country: params.get('country') || 'Unknown',
      countryCode: params.get('countryCode') || 'XX',
      flag: '🌍',
      lat,
      lon,
      isCustom: true,
    };
  }
  return null;
}

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<ActiveCity>(WORLD_DEFAULT);
  const [recents, setRecents] = useState<ActiveCity[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fromUrl = readUrlCity();
    const stored = fromUrl ?? readStoredCity();
    if (stored) setCityState(stored);
    setRecents(readRecents());
    setIsReady(true);
  }, []);

  const setCity = useCallback((next: ActiveCity) => {
    setCityState(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      setRecents((prev) => {
        const filtered = prev.filter((c) => c.id !== next.id);
        const updated = [next, ...filtered].slice(0, MAX_RECENTS);
        try {
          localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      const url = new URL(window.location.href);
      url.searchParams.set('city', next.id);
      if (next.isCustom) {
        url.searchParams.set('lat', String(next.lat));
        url.searchParams.set('lon', String(next.lon));
        url.searchParams.set('name', next.name);
        url.searchParams.set('country', next.country);
        url.searchParams.set('countryCode', next.countryCode);
      } else {
        url.searchParams.delete('lat');
        url.searchParams.delete('lon');
        url.searchParams.delete('name');
        url.searchParams.delete('country');
        url.searchParams.delete('countryCode');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('city', city.id);
    if (city.isCustom) {
      params.set('lat', String(city.lat));
      params.set('lon', String(city.lon));
      params.set('name', city.name);
      params.set('country', city.country);
      params.set('countryCode', city.countryCode);
    }
    return params.toString();
  }, [city]);

  const value = useMemo<CityContextValue>(
    () => ({ city, setCity, recents, apiQuery, isReady }),
    [city, setCity, recents, apiQuery, isReady],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) {
    return {
      city: WORLD_DEFAULT,
      setCity: () => {},
      recents: [],
      apiQuery: 'city=world',
      isReady: false,
    };
  }
  return ctx;
}
