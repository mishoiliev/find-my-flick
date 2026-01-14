// Shared discover logic that can be used by both API routes and server components

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function discoverShowsByGenreLogic(
  genreIds: string[],
  type: 'all' | 'movie' | 'tv' = 'all',
  page: string = '1',
  maxResults: number = 50
): Promise<{
  results: any[];
  page: number;
  total_pages: number;
  total_results: number;
}> {
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
      console.error(
        `Movie API error: ${movieResponse.status} ${movieResponse.statusText}`
      );
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
      console.error(
        `TV API error: ${tvResponse.status} ${tvResponse.statusText}`
      );
    }

    allResults = [...movies, ...tvShows];

    // Sort by popularity
    allResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
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
    } else {
      console.error(
        `Movie API error: ${response.status} ${response.statusText}`
      );
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
    } else {
      console.error(`TV API error: ${response.status} ${response.statusText}`);
    }
  }

  // Limit to maxResults and ensure we always return an array
  const finalResults = (allResults || []).slice(0, maxResults);

  return {
    results: finalResults,
    page: parseInt(page),
    total_pages: 1,
    total_results: finalResults.length,
  };
}
