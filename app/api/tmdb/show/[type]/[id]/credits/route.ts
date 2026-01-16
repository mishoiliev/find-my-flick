import { NextRequest, NextResponse } from 'next/server';

// Enable caching to reduce edge requests
export const revalidate = 3600; // Cache for 1 hour
export const runtime = 'nodejs';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ type: string; id: string }>;
  }
) {
  const { type, id } = await params;

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json(
      { error: 'Invalid type. Must be "movie" or "tv"' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/credits?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch show credits');
    }

    const data = await response.json();
    // Return cast sorted by order (main cast first)
    const cast = (data.cast || []).sort((a: any, b: any) => a.order - b.order);

    return NextResponse.json(
      { cast },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching show credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch show credits' },
      { status: 500 }
    );
  }
}
