import {
  CACHE_TTL,
  noStoreHeaders,
  publicCacheHeaders,
} from '@/lib/http-cache';
import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const requestedType = request.nextUrl.searchParams.get('type');
  const type =
    requestedType === 'movie' || requestedType === 'tv'
      ? requestedType
      : 'all';
  const page = Math.max(
    1,
    Math.min(
      500,
      parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1
    )
  );
  const mediaTypes: Array<'movie' | 'tv'> =
    type === 'all' ? ['movie', 'tv'] : [type];

  try {
    const responses = await Promise.all(
      mediaTypes.map((mediaType) =>
        fetch(
          `${TMDB_BASE_URL}/${mediaType}/popular?api_key=${TMDB_API_KEY}&page=${page}`,
          { next: { revalidate: CACHE_TTL.catalog } }
        )
      )
    );

    if (responses.some((response) => !response.ok)) {
      throw new Error('TMDB popular request failed');
    }

    const payloads = await Promise.all(responses.map((response) => response.json()));
    const results = payloads
      .flatMap((payload, index) => {
        const mediaType = mediaTypes[index];
        return (payload.results || []).map((show: any) => ({
          ...show,
          media_type: mediaType,
          title: show.title || show.name,
          name: show.name || show.title,
        }));
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return NextResponse.json(
      { results },
      { headers: publicCacheHeaders(CACHE_TTL.catalog) }
    );
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shows', results: [] },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
