import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedImdbId,
  getCachedImdbRating,
  setCachedImdbId,
} from '@/lib/imdb-cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Enrich show with IMDB rating
async function enrichShowWithIMDBRating(
  show: any,
  mediaType: 'movie' | 'tv'
): Promise<any> {
  if (show.imdb_rating !== undefined) {
    return show;
  }

  try {
    let imdbId = await getCachedImdbId(mediaType, show.id);

    if (!imdbId) {
      const externalIdsResponse = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${show.id}/external_ids?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 },
        }
      );

      if (externalIdsResponse.ok) {
        const externalIds = await externalIdsResponse.json();
        imdbId = externalIds.imdb_id;
        if (imdbId) {
          await setCachedImdbId(mediaType, show.id, imdbId);
        }
      }
    }

    if (imdbId) {
      show.imdb_id = imdbId;
      const imdbRating = await getCachedImdbRating(imdbId);
      if (imdbRating !== null) {
        show.imdb_rating = imdbRating;
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
