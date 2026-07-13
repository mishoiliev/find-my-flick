import {
  CACHE_TTL,
  noStoreHeaders,
  publicCacheHeaders,
} from '@/lib/http-cache';
import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const revalidate = 21600;

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 100);
  const page = Math.max(
    1,
    Math.min(
      500,
      parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1
    )
  );

  if (query.length < 2) {
    return NextResponse.json(
      { error: 'Query must contain at least two characters' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`,
        { next: { revalidate: CACHE_TTL.search } }
      ),
      fetch(
        `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`,
        { next: { revalidate: CACHE_TTL.search } }
      ),
    ]);

    if (!movieResponse.ok || !tvResponse.ok) {
      throw new Error('TMDB search request failed');
    }

    const [movieData, tvData] = await Promise.all([
      movieResponse.json(),
      tvResponse.json(),
    ]);
    const results = [
      ...(movieData.results || []).map((show: any) => ({
        ...show,
        media_type: 'movie',
        title: show.title || show.name,
        name: show.name || show.title,
      })),
      ...(tvData.results || []).map((show: any) => ({
        ...show,
        media_type: 'tv',
        title: show.name || show.title,
        name: show.name || show.title,
      })),
    ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const totalResults = movieData.total_results + tvData.total_results;
    const totalPages = Math.min(
      500,
      Math.max(movieData.total_pages || 0, tvData.total_pages || 0)
    );

    return NextResponse.json(
      {
        results,
        page,
        total_pages: totalPages,
        total_results: totalResults,
      },
      { headers: publicCacheHeaders(CACHE_TTL.search) }
    );
  } catch (error) {
    console.error('Error searching shows:', error);
    return NextResponse.json(
      {
        error: 'Failed to search shows',
        results: [],
        page: 1,
        total_pages: 0,
        total_results: 0,
      },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
