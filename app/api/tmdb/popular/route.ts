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
  const type = searchParams.get('type') || 'all'; // 'all', 'movie', 'tv'

  try {
    let results: any[] = [];

    if (type === 'all') {
      const [moviesRes, tvRes] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`, {
          next: { revalidate: 1800 },
        }),
        fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`, {
          next: { revalidate: 1800 },
        }),
      ]);

      const moviesData = await moviesRes.json();
      const tvData = await tvRes.json();

      const movies = moviesData.results.map((m: any) => ({
        ...m,
        media_type: 'movie',
        title: m.title || m.name,
        name: m.name || m.title,
      }));

      const tvShows = tvData.results.map((t: any) => ({
        ...t,
        media_type: 'tv',
        title: t.name || t.title,
        name: t.name || t.title,
      }));

      results = [...movies, ...tvShows].slice(0, 20);
    } else if (type === 'movie') {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 1800 },
        }
      );

      const data = await response.json();
      results = data.results.map((m: any) => ({
        ...m,
        media_type: 'movie',
        title: m.title || m.name,
        name: m.name || m.title,
      }));

      // Enrich with IMDB ratings
      results = await enrichShowsWithIMDBRatings(results, 'movie');
    } else if (type === 'tv') {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 1800 },
        }
      );

      const data = await response.json();
      results = data.results.map((t: any) => ({
        ...t,
        media_type: 'tv',
        title: t.name || t.title,
        name: t.name || t.title,
      }));

      // Enrich with IMDB ratings
      results = await enrichShowsWithIMDBRatings(results, 'tv');
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching popular shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular shows' },
      { status: 500 }
    );
  }
}
