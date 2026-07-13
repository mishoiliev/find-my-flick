import { discoverShowsByGenreLogic } from '@/lib/discover';
import {
  CACHE_TTL,
  noStoreHeaders,
  publicCacheHeaders,
} from '@/lib/http-cache';
import { MOVIE_GENRES, TV_GENRES } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 86400;

const validGenreIds = new Set([
  ...Object.keys(MOVIE_GENRES),
  ...Object.keys(TV_GENRES),
]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const typeParam = searchParams.get('type');
  const type: 'all' | 'movie' | 'tv' =
    typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all';
  const page = Math.max(
    1,
    Math.min(500, parseInt(searchParams.get('page') || '1', 10) || 1)
  );
  const maxResults = Math.max(
    1,
    Math.min(50, parseInt(searchParams.get('maxResults') || '50', 10) || 50)
  );
  const genreIds = (searchParams.get('genres') || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => validGenreIds.has(id))
    .slice(0, 8)
    .sort();

  if (genreIds.length === 0) {
    return NextResponse.json(
      { error: 'At least one valid genre ID is required' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  try {
    const result = await discoverShowsByGenreLogic(
      genreIds,
      type,
      String(page),
      maxResults
    );
    return NextResponse.json(result, {
      headers: publicCacheHeaders(CACHE_TTL.catalog),
    });
  } catch (error) {
    console.error('Error discovering shows by genre:', error);
    return NextResponse.json(
      {
        error: 'Failed to discover shows by genre',
        results: [],
        page: 1,
        total_pages: 0,
        total_results: 0,
      },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
