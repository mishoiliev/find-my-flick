import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_API_KEY = process.env.OMDB_API_KEY || '';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

// Get IMDB rating from OMDB API
async function getIMDBRating(imdbId: string): Promise<number | null> {
  if (!OMDB_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${OMDB_BASE_URL}/?i=${imdbId}&apikey=${OMDB_API_KEY}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.Response === 'True' && data.imdbRating) {
      const rating = parseFloat(data.imdbRating);
      return isNaN(rating) ? null : rating;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Enrich show with IMDB rating
async function enrichShowWithIMDBRating(
  show: any,
  mediaType: 'movie' | 'tv'
): Promise<any> {
  if (show.imdb_rating !== undefined) {
    return show;
  }

  try {
    const externalIdsResponse = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${show.id}/external_ids?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (externalIdsResponse.ok) {
      const externalIds = await externalIdsResponse.json();
      const imdbId = externalIds.imdb_id;

      if (imdbId) {
        show.imdb_id = imdbId;
        const imdbRating = await getIMDBRating(imdbId);
        if (imdbRating !== null) {
          show.imdb_rating = imdbRating;
        }
      }
    }
  } catch (error) {
    // Silently fail
  }

  return show;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shows } = body;

    if (!Array.isArray(shows)) {
      return NextResponse.json(
        { error: 'Shows must be an array' },
        { status: 400 }
      );
    }

    // Process in batches to avoid rate limiting
    const batchSize = 5;
    const enrichedShows: any[] = [];

    for (let i = 0; i < shows.length; i += batchSize) {
      const batch = shows.slice(i, i + batchSize);
      const enrichedBatch = await Promise.all(
        batch.map((show: any) =>
          enrichShowWithIMDBRating(show, show.media_type || 'movie')
        )
      );
      enrichedShows.push(...enrichedBatch);

      // Small delay between batches
      if (i + batchSize < shows.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({ shows: enrichedShows });
  } catch (error) {
    console.error('Error enriching shows:', error);
    return NextResponse.json(
      { error: 'Failed to enrich shows' },
      { status: 500 }
    );
  }
}
