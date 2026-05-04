import { NextRequest, NextResponse } from 'next/server';
import { CITIES } from '@/lib/cities/registry';
import { geocodeCity } from '@/lib/cities/discoverCity';

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

function flagFromCountryCode(cc: string): string {
  if (!cc || cc.length !== 2) return '🌍';
  const codePoints = cc.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ results: [] });

  const lower = q.toLowerCase();
  const catalogHits: SearchHit[] = CITIES
    .filter((c) =>
      c.name.toLowerCase().includes(lower) ||
      c.country.toLowerCase().includes(lower) ||
      c.id.includes(lower),
    )
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      countryCode: c.countryCode,
      flag: c.flag,
      lat: c.lat,
      lon: c.lon,
      source: 'catalog',
    }));

  let globalHits: SearchHit[] = [];
  if (q.length >= 3) {
    try {
      const geocoded = await geocodeCity(q);
      const seenCoords = new Set(catalogHits.map((h) => `${h.lat.toFixed(1)}:${h.lon.toFixed(1)}`));
      const seenNames = new Set(catalogHits.map((h) => `${h.name.toLowerCase()}:${h.country.toLowerCase()}`));
      
      globalHits = geocoded
        .map((g): SearchHit | null => {
          const lat = parseFloat(g.lat);
          const lon = parseFloat(g.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          
          const cityName = g.address?.city || g.address?.town || g.address?.village || g.display_name.split(',')[0];
          const country = g.address?.country || 'Unknown';
          
          const coordKey = `${lat.toFixed(1)}:${lon.toFixed(1)}`;
          const nameKey = `${cityName.toLowerCase()}:${country.toLowerCase()}`;
          
          if (seenCoords.has(coordKey) || seenNames.has(nameKey)) return null;
          seenCoords.add(coordKey);
          seenNames.add(nameKey);
          
          const cc = (g.address?.country_code || '').toUpperCase();
          return {
            id: `custom_${cityName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Math.abs(Math.round(lat * 100))}_${Math.abs(Math.round(lon * 100))}`,
            name: cityName,
            country: country,
            countryCode: cc,
            flag: flagFromCountryCode(cc),
            lat,
            lon,
            source: 'global',
            isCustom: true,
            displayName: g.display_name,
          };
        })
        .filter((h): h is SearchHit => h !== null)
        .slice(0, 6);
    } catch (e) {
      // ignore geocode errors
    }
  }

  return NextResponse.json({ results: [...catalogHits, ...globalHits] });
}
