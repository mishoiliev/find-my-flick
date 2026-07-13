import {
  CACHE_TTL,
  noStoreHeaders,
  publicCacheHeaders,
} from '@/lib/http-cache';
import { countries } from '@/lib/countries';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 604800;
export const runtime = 'nodejs';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const validCountries = new Set(countries.map((country) => country.code));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const showId = parseInt(id, 10);
  const requestedCountry = (
    request.nextUrl.searchParams.get('country') || ''
  ).toUpperCase();

  if (
    (type !== 'movie' && type !== 'tv') ||
    !Number.isInteger(showId) ||
    showId <= 0 ||
    !validCountries.has(requestedCountry)
  ) {
    return NextResponse.json(
      { error: 'A valid type, show ID, and country are required' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${showId}/watch/providers?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: CACHE_TTL.providers } }
    );
    if (!response.ok) throw new Error('TMDB watch-provider request failed');

    const data = await response.json();
    return NextResponse.json(data.results?.[requestedCountry] || null, {
      headers: publicCacheHeaders(CACHE_TTL.providers),
    });
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watch providers' },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
