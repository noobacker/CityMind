type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export const TTL = {
  COMPLAINTS: 5 * 60 * 1000,
  MTA: 2 * 60 * 1000,
  AQI: 10 * 60 * 1000,
  WEATHER: 10 * 60 * 1000,
  EVENTS: 60 * 60 * 1000,
  CITY_PULSE: 5 * 60 * 1000,
} as const;

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}