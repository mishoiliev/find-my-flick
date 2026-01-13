import {
  getCachedImdbIds,
  getCachedImdbRatings,
  setCachedImdbIds,
} from '@/lib/imdb-cache';
import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Enrich multiple shows with IMDB ratings
async function enrichShowsWithIMDBRatings(
  shows: any[],
  mediaType: 'movie' | 'tv'
): Promise<any[]> {
  // If no shows, return empty array
  if (!shows || shows.length === 0) {
    return [];
  }

  // If enrichment fails, return original shows
  try {
    const showsToEnrich = shows.slice(0, 20);
    const remainingShows = shows.slice(20);

    const batchSize = 5;
    const enrichedShows: any[] = [];

    for (let i = 0; i < showsToEnrich.length; i += batchSize) {
      const batch = showsToEnrich.slice(i, i + batchSize);
      const tmdbIds = batch.map((show) => show.id);
      const cachedMappings = await getCachedImdbIds(mediaType, tmdbIds);
      const newMappings = new Map<number, string>();

      const resolved = await Promise.all(
        batch.map(async (show) => {
          if (show.imdb_rating !== undefined) {
            return { show, imdbId: show.imdb_id || null };
          }

          let imdbId = cachedMappings.get(show.id) || null;

          if (!imdbId) {
            const externalIdsResponse = await fetch(
              `${TMDB_BASE_URL}/${mediaType}/${show.id}/external_ids?api_key=${TMDB_API_KEY}`,
              {
                next: { revalidate: 3600 },
              }
            );

            if (externalIdsResponse.ok) {
              const externalIds = await externalIdsResponse.json();
              imdbId = externalIds.imdb_id || null;
              if (imdbId) {
                newMappings.set(show.id, imdbId);
              }
            }
          }

          return { show, imdbId };
        })
      );

      if (newMappings.size > 0) {
        await setCachedImdbIds(mediaType, newMappings);
      }

      const imdbIds = resolved
        .filter((item) => item.imdbId && item.show.imdb_rating === undefined)
        .map((item) => item.imdbId as string);
      const ratings = imdbIds.length
        ? await getCachedImdbRatings(imdbIds)
        : new Map<string, number>();

      resolved.forEach(({ show, imdbId }) => {
        if (imdbId) {
          show.imdb_id = imdbId;
          if (show.imdb_rating === undefined) {
            const rating = ratings.get(imdbId);
            if (rating !== undefined) {
              show.imdb_rating = rating;
            }
          }
        }
        enrichedShows.push(show);
      });
    }

    return [...enrichedShows, ...remainingShows];
  } catch (error) {
    // If enrichment fails, return original shows
    console.error('Error enriching shows with IMDB ratings:', error);
    return shows;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const page = searchParams.get('page') || '1';
  const maxResults = searchParams.get('maxResults') || '30';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          query
        )}&page=${page}`,
        {
          next: { revalidate: 600 },
        }
      ),
      fetch(
        `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          query
        )}&page=${page}`,
        {
          next: { revalidate: 600 },
        }
      ),
    ]);

    if (!movieResponse.ok || !tvResponse.ok) {
      throw new Error('Failed to search shows');
    }

    const movieData = await movieResponse.json();
    const tvData = await tvResponse.json();

    // Combine and normalize results
    const combinedResults = [
      ...movieData.results.map((m: any) => ({
        ...m,
        media_type: 'movie',
        title: m.title || m.name,
        name: m.name || m.title,
      })),
      ...tvData.results.map((t: any) => ({
        ...t,
        media_type: 'tv',
        title: t.name || t.title,
        name: t.name || t.title,
      })),
    ];

    // Calculate pagination
    const combinedTotal = movieData.total_results + tvData.total_results;
    const resultsPerPage = 40;
    const calculatedTotalPages = Math.ceil(combinedTotal / resultsPerPage);
    const maxTotalPages = Math.max(movieData.total_pages, tvData.total_pages);

    // Enrich top results with IMDB ratings (if enrichment fails, continue with unenriched results)
    const top20Results = combinedResults.slice(0, 20);
    const top20Movies = top20Results.filter(
      (s: any) => s.media_type === 'movie'
    );
    const top20TVShows = top20Results.filter((s: any) => s.media_type === 'tv');

    let enrichedMovies: any[] = [];
    let enrichedTVShows: any[] = [];

    try {
      enrichedMovies = await enrichShowsWithIMDBRatings(
        top20Movies.slice(0, 10),
        'movie'
      );
    } catch (error) {
      console.error('Error enriching movies with IMDB ratings:', error);
      enrichedMovies = top20Movies.slice(0, 10);
    }

    try {
      enrichedTVShows = await enrichShowsWithIMDBRatings(
        top20TVShows.slice(0, 10),
        'tv'
      );
    } catch (error) {
      console.error('Error enriching TV shows with IMDB ratings:', error);
      enrichedTVShows = top20TVShows.slice(0, 10);
    }

    // Reconstruct results
    const enrichedMap = new Map();
    [...enrichedMovies, ...enrichedTVShows].forEach((show) => {
      enrichedMap.set(show.id, show);
    });

    const enrichedTop20 = top20Results.map(
      (show: any) => enrichedMap.get(show.id) || show
    );

    const finalResults = [...enrichedTop20, ...combinedResults.slice(20)].slice(
      0,
      parseInt(maxResults)
    );

    // Ensure we always return results array, even if empty
    return NextResponse.json({
      results: finalResults || [],
      page: parseInt(page),
      total_pages: Math.max(calculatedTotalPages, maxTotalPages),
      total_results: combinedTotal,
    });
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
      { status: 500 }
    );
  }
}
