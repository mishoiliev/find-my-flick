import { NextRequest, NextResponse } from 'next/server';
import { getCachedImdbRating } from '@/lib/imdb-cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params;

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json(
      { error: 'Invalid type. Must be "movie" or "tv"' },
      { status: 400 }
    );
  }

  try {
    const [showResponse, externalIdsResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}`, {
        next: { revalidate: 3600 },
      }),
      fetch(
        `${TMDB_BASE_URL}/${type}/${id}/external_ids?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 },
        }
      ),
    ]);

    if (!showResponse.ok) {
      throw new Error('Failed to fetch show details');
    }

    const data: any = await showResponse.json();
    const show = {
      ...data,
      media_type: type,
      title: type === 'movie' ? data.title : data.name,
      name: type === 'tv' ? data.name : data.title,
    };

    // Get IMDB ID and rating
    if (externalIdsResponse.ok) {
      const externalIds = await externalIdsResponse.json();
      const imdbId = externalIds.imdb_id;

      if (imdbId) {
        show.imdb_id = imdbId;
        const imdbRating = await getCachedImdbRating(imdbId);
        if (imdbRating !== null) {
          show.imdb_rating = imdbRating;
        }
      }
    }

    return NextResponse.json(show);
  } catch (error) {
    console.error('Error fetching show details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch show details' },
      { status: 500 }
    );
  }
}
