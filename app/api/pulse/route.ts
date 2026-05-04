import { NextRequest, NextResponse } from 'next/server';
import { getCityPulse } from '@/lib/pulse/buildCityContext';
import { resolveCityFromSearchParams } from '@/lib/cities/resolveCity';

export async function GET(request: NextRequest) {
  const city = await resolveCityFromSearchParams(request.nextUrl.searchParams);
  const pulse = await getCityPulse(city);
  return NextResponse.json(pulse);
}
