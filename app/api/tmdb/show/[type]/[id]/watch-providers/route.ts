import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params;
  const searchParams = request.nextUrl.searchParams;
  const countryCode = searchParams.get('country') || 'US';

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json(
      { error: 'Invalid type. Must be "movie" or "tv"' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/watch/providers?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 86400 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch watch providers');
    }

    const data = await response.json();
    const providers = data.results[countryCode] || null;

    return NextResponse.json(providers);
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watch providers' },
      { status: 500 }
    );
  }
}
