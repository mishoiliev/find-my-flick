// Shared discover logic that can be used by both API routes and server components
import {
  getCachedImdbIds,
  getCachedImdbRatings,
  setCachedImdbIds,
} from '@/lib/imdb-cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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
}

export async function discoverShowsByGenreLogic(
  genreIds: string[],
  type: 'all' | 'movie' | 'tv' = 'all',
  page: string = '1',
  maxResults: number = 50
): Promise<{ results: any[]; page: number; total_pages: number; total_results: number }> {
  let allResults: any[] = [];

  // Combine all genre IDs into a comma-separated string for AND logic
  // TMDB API with_genres parameter accepts comma-separated IDs and returns results matching ALL genres
  const combinedGenreIds = genreIds.join(',');

  if (type === 'all') {
    // Fetch both movies and TV shows with all genres combined
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${combinedGenreIds}&sort_by=popularity.desc&page=${page}`,
        {
          next: { revalidate: 1800 },
        }
      ),
      fetch(
        `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${combinedGenreIds}&sort_by=popularity.desc&page=${page}`,
        {
          next: { revalidate: 1800 },
        }
      ),
    ]);

    // Check if responses are OK before parsing
    let movies: any[] = [];
    let tvShows: any[] = [];

    if (movieResponse.ok) {
      const movieData = await movieResponse.json();
      movies = (movieData.results || []).map((m: any) => ({
        ...m,
        media_type: 'movie',
        title: m.title || m.name,
        name: m.name || m.title,
      }));
    } else {
      console.error(`Movie API error: ${movieResponse.status} ${movieResponse.statusText}`);
    }

    if (tvResponse.ok) {
      const tvData = await tvResponse.json();
      tvShows = (tvData.results || []).map((t: any) => ({
        ...t,
        media_type: 'tv',
        title: t.name || t.title,
        name: t.name || t.title,
      }));
    } else {
      console.error(`TV API error: ${tvResponse.status} ${tvResponse.statusText}`);
    }

    allResults = [...movies, ...tvShows];

    // Sort by popularity
    allResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    // Enrich top results with IMDB ratings
    const top20Results = allResults.slice(0, 20);
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
      enrichedMap.set(`${show.media_type}-${show.id}`, show);
    });

    const enrichedTop20 = top20Results.map(
      (show: any) => enrichedMap.get(`${show.media_type}-${show.id}`) || show
    );

    allResults = [...enrichedTop20, ...allResults.slice(20)];
  } else if (type === 'movie') {
    // Fetch movies with all genres combined (AND logic)
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${combinedGenreIds}&sort_by=popularity.desc&page=${page}`,
      {
        next: { revalidate: 1800 },
      }
    );

    if (response.ok) {
      const data = await response.json();
      allResults = (data.results || []).map((m: any) => ({
        ...m,
        media_type: 'movie',
        title: m.title || m.name,
        name: m.name || m.title,
      }));

      // Sort by popularity
      allResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      // Enrich with IMDB ratings
      allResults = await enrichShowsWithIMDBRatings(
        allResults.slice(0, 20),
        'movie'
      );
    } else {
      console.error(`Movie API error: ${response.status} ${response.statusText}`);
    }
  } else if (type === 'tv') {
    // Fetch TV shows with all genres combined (AND logic)
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${combinedGenreIds}&sort_by=popularity.desc&page=${page}`,
      {
        next: { revalidate: 1800 },
      }
    );

    if (response.ok) {
      const data = await response.json();
      allResults = (data.results || []).map((t: any) => ({
        ...t,
        media_type: 'tv',
        title: t.name || t.title,
        name: t.name || t.title,
      }));

      // Sort by popularity
      allResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      // Enrich with IMDB ratings
      allResults = await enrichShowsWithIMDBRatings(
        allResults.slice(0, 20),
        'tv'
      );
    } else {
      console.error(`TV API error: ${response.status} ${response.statusText}`);
    }
  }

  // Limit to maxResults
  const finalResults = allResults.slice(0, maxResults);

  return {
    results: finalResults,
    page: parseInt(page),
    total_pages: 1,
    total_results: finalResults.length,
  };
}
