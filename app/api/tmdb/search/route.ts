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

// Enrich multiple shows with IMDB ratings
async function enrichShowsWithIMDBRatings(
  shows: any[],
  mediaType: 'movie' | 'tv'
): Promise<any[]> {
  const showsToEnrich = shows.slice(0, 20);
  const remainingShows = shows.slice(20);

  const batchSize = 5;
  const enrichedShows: any[] = [];

  for (let i = 0; i < showsToEnrich.length; i += batchSize) {
    const batch = showsToEnrich.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map((show) => enrichShowWithIMDBRating(show, mediaType))
    );
    enrichedShows.push(...enrichedBatch);
  }

  return [...enrichedShows, ...remainingShows];
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

    // Enrich top results with IMDB ratings
    const top20Results = combinedResults.slice(0, 20);
    const top20Movies = top20Results.filter((s: any) => s.media_type === 'movie');
    const top20TVShows = top20Results.filter((s: any) => s.media_type === 'tv');

    const enrichedMovies = await enrichShowsWithIMDBRatings(
      top20Movies.slice(0, 10),
      'movie'
    );
    const enrichedTVShows = await enrichShowsWithIMDBRatings(
      top20TVShows.slice(0, 10),
      'tv'
    );

    // Reconstruct results
    const enrichedMap = new Map();
    [...enrichedMovies, ...enrichedTVShows].forEach((show) => {
      enrichedMap.set(show.id, show);
    });

    const enrichedTop20 = top20Results.map(
      (show: any) => enrichedMap.get(show.id) || show
    );

    const finalResults = [
      ...enrichedTop20,
      ...combinedResults.slice(20),
    ].slice(0, parseInt(maxResults));

    return NextResponse.json({
      results: finalResults,
      page: parseInt(page),
      total_pages: Math.max(calculatedTotalPages, maxTotalPages),
      total_results: combinedTotal,
    });
  } catch (error) {
    console.error('Error searching shows:', error);
    return NextResponse.json(
      { error: 'Failed to search shows' },
      { status: 500 }
    );
  }
}
