import { cache } from 'react';
import {
  cache as clientCache,
  getPopularActorsCacheKey,
  getPopularShowsCacheKey,
  getSearchCacheKey,
} from './cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const OMDB_API_KEY = process.env.OMDB_API_KEY || '';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  SEARCH: 10 * 60 * 1000, // 10 minutes
  POPULAR: 30 * 60 * 1000, // 30 minutes
  SHOW_DETAILS: 60 * 60 * 1000, // 1 hour
  WATCH_PROVIDERS: 24 * 60 * 60 * 1000, // 24 hours
};

export interface Show {
  id: number;
  title: string;
  name?: string; // For TV shows
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  last_air_date?: string; // End date for TV shows
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  media_type?: 'movie' | 'tv';
  revenue?: number; // Box office revenue for movies
  order?: number; // Role order/importance in cast (lower = more important, used for actor credits)
  episode_count?: number; // Number of episodes actor appeared in (for TV shows)
  imdb_rating?: number; // IMDB rating (0-10 scale)
  imdb_id?: string; // IMDB ID (e.g., "tt0111161")
}

export interface TMDBResponse {
  results: Show[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface WatchProvider {
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

export interface WatchProviders {
  link?: string;
  flatrate?: WatchProvider[]; // Streaming
  rent?: WatchProvider[]; // Rent
  buy?: WatchProvider[]; // Buy
}

export interface WatchProvidersResponse {
  id: number;
  results: {
    [countryCode: string]: WatchProviders;
  };
}

export interface Actor {
  id: number;
  name: string;
  popularity: number;
  profile_path: string | null;
}

export interface ActorResponse {
  results: Actor[];
  page: number;
  total_pages: number;
  total_results: number;
}

// Normalize a show object to ensure consistency across all pages
// This ensures all Show objects have the same structure regardless of source
export function normalizeShow(
  show: Partial<Show>,
  mediaType: 'movie' | 'tv'
): Show {
  // TMDB returns 'title' for movies and 'name' for TV shows
  // We ensure both fields are populated for consistency
  const title = show.title || show.name || '';
  const name = show.name || show.title || undefined;

  return {
    id: show.id!,
    title,
    name,
    overview: show.overview || '',
    poster_path: show.poster_path ?? null,
    backdrop_path: show.backdrop_path ?? null,
    release_date: show.release_date,
    first_air_date: show.first_air_date,
    last_air_date: show.last_air_date,
    vote_average: show.vote_average ?? 0,
    vote_count: show.vote_count,
    popularity: show.popularity,
    media_type: mediaType,
    revenue: show.revenue,
    order: show.order,
    episode_count: show.episode_count,
    imdb_rating: show.imdb_rating,
    imdb_id: show.imdb_id,
  };
}

// Get the display title (handles both movies and TV shows)
export function getShowTitle(show: Show): string {
  return show.title || show.name || 'Unknown';
}

// Get the release date (handles both movies and TV shows)
export function getShowDate(show: Show): string {
  return show.release_date || show.first_air_date || 'Unknown';
}

// Get the rating (prefers IMDB rating, falls back to TMDB vote_average)
export function getShowRating(show: Show): number {
  return show.imdb_rating ?? show.vote_average;
}

// Get poster image URL
export function getPosterUrl(posterPath: string | null): string {
  if (!posterPath) {
    return '/placeholder-poster.png';
  }
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
}

// Get backdrop image URL
export function getBackdropUrl(backdropPath: string | null): string {
  if (!backdropPath) {
    return '/placeholder-backdrop.png';
  }
  return `https://image.tmdb.org/t/p/w1280${backdropPath}`;
}

// Sort shows by popularity (prioritizing items with posters)
export function sortShowsByPopularity(shows: Show[]): Show[] {
  return [...shows].sort((a, b) => {
    // First priority: items with posters come first
    const aHasPoster = a.poster_path !== null;
    const bHasPoster = b.poster_path !== null;
    if (aHasPoster !== bHasPoster) {
      return bHasPoster ? 1 : -1;
    }

    // Second priority: popularity (higher is better)
    const aPopularity = a.popularity || 0;
    const bPopularity = b.popularity || 0;
    if (Math.abs(aPopularity - bPopularity) > 0.1) {
      return bPopularity - aPopularity;
    }

    // Third priority: vote count (more votes = more reliable)
    const aVoteCount = a.vote_count || 0;
    const bVoteCount = b.vote_count || 0;
    if (aVoteCount !== bVoteCount) {
      return bVoteCount - aVoteCount;
    }

    // Fourth priority: vote average (higher rating is better)
    return (b.vote_average || 0) - (a.vote_average || 0);
  });
}

// Sort shows by date (newest first)
export function sortShowsByDate(shows: Show[]): Show[] {
  return [...shows].sort((a, b) => {
    // First priority: items with posters come first
    const aHasPoster = a.poster_path !== null;
    const bHasPoster = b.poster_path !== null;
    if (aHasPoster !== bHasPoster) {
      return bHasPoster ? 1 : -1;
    }

    // Get dates (release_date for movies, first_air_date for TV)
    const aDate = a.release_date || a.first_air_date || '';
    const bDate = b.release_date || b.first_air_date || '';

    // Sort by date descending (newest first)
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1; // No date goes to end
    if (!bDate) return -1; // No date goes to end

    return bDate.localeCompare(aDate); // Descending order (newest first)
  });
}

// Sort shows by comprehensive score (hype, reviews, box office, role importance)
// This considers: popularity (hype), vote_average & vote_count (reviews), revenue (box office), order (role size)
export function sortShowsByComprehensiveScore(shows: Show[]): Show[] {
  return [...shows].sort((a, b) => {
    // First priority: items with posters come first
    const aHasPoster = a.poster_path !== null;
    const bHasPoster = b.poster_path !== null;
    if (aHasPoster !== bHasPoster) {
      return bHasPoster ? 1 : -1;
    }

    // Calculate comprehensive score
    // Normalize values to create a weighted score
    const aPopularity = (a.popularity || 0) * 0.25; // 25% weight for hype
    const bPopularity = (b.popularity || 0) * 0.25;

    // Reviews: combine vote_average (0-10 scale) and vote_count (normalized)
    const aVoteAvg = (a.vote_average || 0) * 10; // Convert to 0-100 scale
    const bVoteAvg = (b.vote_average || 0) * 10;
    const aVoteCount = Math.min((a.vote_count || 0) / 1000, 1) * 50; // Normalize vote count (max 50 points)
    const bVoteCount = Math.min((b.vote_count || 0) / 1000, 1) * 50;
    const aReviewScore = (aVoteAvg + aVoteCount) * 0.35; // 35% weight for reviews
    const bReviewScore = (bVoteAvg + bVoteCount) * 0.35;

    // Box office: normalize revenue (movies only, TV shows get 0)
    const aRevenue = a.revenue || 0;
    const bRevenue = b.revenue || 0;
    const aBoxOffice = Math.min(Math.log10(aRevenue + 1) / 10, 1) * 100 * 0.25; // 25% weight, log scale for revenue
    const bBoxOffice = Math.min(Math.log10(bRevenue + 1) / 10, 1) * 100 * 0.25;

    // Role importance: lower order = more important role (0 = lead, 1 = supporting, etc.)
    // Normalize order: 0-10 gets full points, 10+ gets diminishing returns
    const aOrder = a.order ?? 999; // Default to 999 if missing (very low importance)
    const bOrder = b.order ?? 999;
    // Invert and normalize: order 0 = 100 points, order 10 = 0 points, order 20+ = 0 points
    const aRoleScore =
      Math.max(0, (10 - Math.min(aOrder, 10)) / 10) * 100 * 0.15; // 15% weight
    const bRoleScore =
      Math.max(0, (10 - Math.min(bOrder, 10)) / 10) * 100 * 0.15;

    // Calculate base score
    const aBaseScore = aPopularity + aReviewScore + aBoxOffice + aRoleScore;
    const bBaseScore = bPopularity + bReviewScore + bBoxOffice + bRoleScore;

    // Apply episode count penalty for TV shows (heavily penalize shows with very few episodes)
    // For movies (episode_count = 0), no penalty
    // For TV shows: 1 episode = 0.1x multiplier (90% penalty), 2-3 episodes = 0.3x, 4-5 = 0.5x, 6-9 = 0.7x, 10+ = 1.0x (no penalty)
    let aMultiplier = 1.0;
    let bMultiplier = 1.0;

    if (a.media_type === 'tv' && a.episode_count !== undefined) {
      const episodeCount = a.episode_count;
      if (episodeCount === 0 || episodeCount === 1) {
        aMultiplier = 0.1; // 90% penalty for 0-1 episodes
      } else if (episodeCount <= 3) {
        aMultiplier = 0.3; // 70% penalty for 2-3 episodes
      } else if (episodeCount <= 5) {
        aMultiplier = 0.5; // 50% penalty for 4-5 episodes
      } else if (episodeCount <= 9) {
        aMultiplier = 0.7; // 30% penalty for 6-9 episodes
      }
      // 10+ episodes = 1.0 (no penalty)
    }

    if (b.media_type === 'tv' && b.episode_count !== undefined) {
      const episodeCount = b.episode_count;
      if (episodeCount === 0 || episodeCount === 1) {
        bMultiplier = 0.1; // 90% penalty for 0-1 episodes
      } else if (episodeCount <= 3) {
        bMultiplier = 0.3; // 70% penalty for 2-3 episodes
      } else if (episodeCount <= 5) {
        bMultiplier = 0.5; // 50% penalty for 4-5 episodes
      } else if (episodeCount <= 9) {
        bMultiplier = 0.7; // 30% penalty for 6-9 episodes
      }
      // 10+ episodes = 1.0 (no penalty)
    }

    const aScore = aBaseScore * aMultiplier;
    const bScore = bBaseScore * bMultiplier;

    return bScore - aScore;
  });
}

// Fetch popular shows (both movies and TV) with caching
export const fetchPopularShows = cache(async (): Promise<Show[]> => {
  const cacheKey = getPopularShowsCacheKey();

  // Check server-side cache (React cache)
  try {
    const [moviesRes, tvRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`, {
        next: { revalidate: 1800 }, // Revalidate every 30 minutes
      }),
      fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`, {
        next: { revalidate: 1800 },
      }),
    ]);

    const moviesData: TMDBResponse = await moviesRes.json();
    const tvData: TMDBResponse = await tvRes.json();

    // Combine and normalize shows
    const movies = moviesData.results.map((m) => normalizeShow(m, 'movie'));
    const tvShows = tvData.results.map((t) => normalizeShow(t, 'tv'));

    // Combine and shuffle for variety
    const allShows = [...movies, ...tvShows];
    return allShows.slice(0, 20); // Return top 20
  } catch (error) {
    console.error('Error fetching popular shows:', error);
    return [];
  }
});

// Fetch popular movies only with caching
// Uses TMDB's popularity algorithm which considers votes, views, and recency
export const fetchPopularMovies = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 1800 }, // Revalidate every 30 minutes
      }
    );

    const data: TMDBResponse = await response.json();

    // Normalize shows
    const movies = data.results.map((m) => normalizeShow(m, 'movie'));

    // Enrich with IMDB ratings (for first 20 to avoid too many API calls)
    const enrichedMovies = await enrichShowsWithIMDBRatings(movies, 'movie');

    return enrichedMovies;
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
});

// Fetch top-rated movies (sorted by vote_average with minimum vote requirements)
export const fetchTopRatedMovies = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 1800 }, // Revalidate every 30 minutes
      }
    );

    const data: TMDBResponse = await response.json();

    // Normalize shows
    const movies = data.results.map((m) => normalizeShow(m, 'movie'));

    return movies;
  } catch (error) {
    console.error('Error fetching top-rated movies:', error);
    return [];
  }
});

// Fetch popular TV shows only with caching
// Uses TMDB's popularity algorithm which considers votes, views, and recency
export const fetchPopularTVShows = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 1800 }, // Revalidate every 30 minutes
      }
    );

    const data: TMDBResponse = await response.json();

    // Normalize shows
    const tvShows = data.results.map((t) => normalizeShow(t, 'tv'));

    // Enrich with IMDB ratings (for first 20 to avoid too many API calls)
    const enrichedTVShows = await enrichShowsWithIMDBRatings(tvShows, 'tv');

    return enrichedTVShows;
  } catch (error) {
    console.error('Error fetching popular TV shows:', error);
    return [];
  }
});

// Fetch top-rated TV shows (sorted by vote_average with minimum vote requirements)
export const fetchTopRatedTVShows = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 1800 }, // Revalidate every 30 minutes
      }
    );

    const data: TMDBResponse = await response.json();

    // Normalize shows
    const tvShows = data.results.map((t) => normalizeShow(t, 'tv'));

    return tvShows;
  } catch (error) {
    console.error('Error fetching top-rated TV shows:', error);
    return [];
  }
});

// Fetch trending movies (what's trending right now - day or week)
export const fetchTrendingMovies = cache(
  async (timeWindow: 'day' | 'week' = 'week'): Promise<Show[]> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 1800 }, // Revalidate every 30 minutes
        }
      );

      const data: TMDBResponse = await response.json();

      // Normalize shows
      const movies = data.results.map((m) => normalizeShow(m, 'movie'));

      return movies;
    } catch (error) {
      console.error('Error fetching trending movies:', error);
      return [];
    }
  }
);

// Fetch trending TV shows (what's trending right now - day or week)
export const fetchTrendingTVShows = cache(
  async (timeWindow: 'day' | 'week' = 'week'): Promise<Show[]> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/tv/${timeWindow}?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 1800 }, // Revalidate every 30 minutes
        }
      );

      const data: TMDBResponse = await response.json();

      // Normalize shows
      const tvShows = data.results.map((t) => normalizeShow(t, 'tv'));

      return tvShows;
    } catch (error) {
      console.error('Error fetching trending TV shows:', error);
      return [];
    }
  }
);

// Fetch popular actors (250 most popular)
export const fetchPopularActors = cache(async (): Promise<Actor[]> => {
  const cacheKey = getPopularActorsCacheKey();

  try {
    // Fetch multiple pages to get 250 actors (20 per page, need 13 pages)
    const pagesToFetch = 13; // 13 * 20 = 260, we'll take top 250
    const requests = Array.from({ length: pagesToFetch }, (_, i) =>
      fetch(
        `${TMDB_BASE_URL}/person/popular?api_key=${TMDB_API_KEY}&page=${i + 1}`,
        {
          next: { revalidate: 86400 }, // Revalidate every 24 hours
        }
      )
    );

    const responses = await Promise.all(requests);
    const dataPromises = responses.map((res) => res.json());
    const allData: ActorResponse[] = await Promise.all(dataPromises);

    // Combine all actors and sort by popularity
    const allActors = allData.flatMap((page) => page.results);
    const sortedActors = allActors
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 250);

    return sortedActors;
  } catch (error) {
    console.error('Error fetching popular actors:', error);
    return [];
  }
});

// Check if query matches a popular actor name
async function findMatchingActor(query: string): Promise<Actor | null> {
  const actors = await fetchPopularActors();
  const normalizedQuery = query.trim().toLowerCase();

  // Find exact match first, then partial match
  const exactMatch = actors.find(
    (actor) => actor.name.toLowerCase() === normalizedQuery
  );
  if (exactMatch) return exactMatch;

  // Find partial match (query contains actor name or vice versa)
  const partialMatch = actors.find(
    (actor) =>
      actor.name.toLowerCase().includes(normalizedQuery) ||
      normalizedQuery.includes(actor.name.toLowerCase())
  );

  return partialMatch || null;
}

// Search shows with caching and actor detection
export async function searchShows(
  query: string,
  page: number = 1,
  maxResults: number = 30
): Promise<TMDBResponse> {
  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = getSearchCacheKey(normalizedQuery, page);

  // Check client-side cache first (if running in browser)
  if (typeof window !== 'undefined') {
    const cached = clientCache.get<TMDBResponse>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    // Use separate endpoints for movies and TV to get consistent results per page
    // This ensures we get 20 movies + 20 TV shows per page instead of mixed results
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          query
        )}&page=${page}`,
        {
          next: { revalidate: 600 }, // Revalidate every 10 minutes
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

    const movieData: TMDBResponse = await movieResponse.json();
    const tvData: TMDBResponse = await tvResponse.json();

    // Combine movie and TV results, normalizing shows
    const combinedResults: Show[] = [
      ...movieData.results.map((m) => normalizeShow(m, 'movie')),
      ...tvData.results.map((t) => normalizeShow(t, 'tv')),
    ];

    // Calculate pagination: we show ~40 results per page (20 movies + 20 TV)
    // Use the maximum of the two total_pages, but adjust based on combined results
    const combinedTotal = movieData.total_results + tvData.total_results;
    const resultsPerPage = 40; // 20 movies + 20 TV shows
    const calculatedTotalPages = Math.ceil(combinedTotal / resultsPerPage);
    const maxTotalPages = Math.max(movieData.total_pages, tvData.total_pages);

    // Use the higher of calculated or max to ensure we don't undercount pages
    const searchData: TMDBResponse = {
      results: combinedResults,
      page: movieData.page,
      total_pages: Math.max(calculatedTotalPages, maxTotalPages),
      total_results: combinedTotal,
    };

    // Check if query matches a popular actor
    const matchingActor = await findMatchingActor(query);
    let actorMovies: Show[] = [];

    if (matchingActor) {
      // Fetch movies and TV shows for this actor
      try {
        const [movieCreditsRes, tvCreditsRes] = await Promise.all([
          fetch(
            `${TMDB_BASE_URL}/person/${matchingActor.id}/movie_credits?api_key=${TMDB_API_KEY}`,
            {
              next: { revalidate: 3600 }, // Revalidate every hour
            }
          ),
          fetch(
            `${TMDB_BASE_URL}/person/${matchingActor.id}/tv_credits?api_key=${TMDB_API_KEY}`,
            {
              next: { revalidate: 3600 },
            }
          ),
        ]);

        if (movieCreditsRes.ok) {
          const movieCredits = await movieCreditsRes.json();
          const movies = (movieCredits.cast || []).map((movie: any) =>
            normalizeShow(movie, 'movie')
          );
          actorMovies.push(...movies);
        }

        if (tvCreditsRes.ok) {
          const tvCredits = await tvCreditsRes.json();
          const tvShows = (tvCredits.cast || []).map((show: any) =>
            normalizeShow(show, 'tv')
          );
          actorMovies.push(...tvShows);
        }
      } catch (error) {
        console.error('Error fetching actor credits:', error);
      }
    }

    // Separate search results from actor matches
    const searchResults: Show[] = searchData.results; // Already filtered to movies/TV only
    const actorMatches: Show[] = [];
    const seenIds = new Set<number>();

    // Track IDs from search results
    for (const result of searchResults) {
      seenIds.add(result.id);
    }

    // Add actor movies that aren't already in search results
    for (const movie of actorMovies) {
      if (!seenIds.has(movie.id)) {
        actorMatches.push(movie);
        seenIds.add(movie.id);
      }
    }

    // Combine search results and actor matches
    const allResults = [...searchResults, ...actorMatches];

    // Sort all results by popularity first
    const sortedResults = sortShowsByPopularity(allResults);

    // Enrich with IMDB ratings (for first 20 to avoid too many API calls)
    // Take top 20 from sorted results, then split by media type
    const top20Results = sortedResults.slice(0, 20);
    const remainingResults = sortedResults.slice(20);

    const top20Movies = top20Results.filter((s) => s.media_type === 'movie');
    const top20TVShows = top20Results.filter((s) => s.media_type === 'tv');

    // Enrich movies and TV shows separately (limit to first 10 of each to stay within 20 total)
    const enrichedMovies = await enrichShowsWithIMDBRatings(
      top20Movies.slice(0, 10),
      'movie'
    );
    const enrichedTVShows = await enrichShowsWithIMDBRatings(
      top20TVShows.slice(0, 10),
      'tv'
    );

    // Combine enriched shows with remaining from top 20, then add remaining results
    const remainingTop20Movies = top20Movies.slice(10);
    const remainingTop20TVShows = top20TVShows.slice(10);

    // Reconstruct top 20 maintaining popularity order
    // Create a map of enriched shows for quick lookup
    const enrichedMap = new Map<number, Show>();
    [...enrichedMovies, ...enrichedTVShows].forEach((show) => {
      enrichedMap.set(show.id, show);
    });

    // Replace shows in top20Results with enriched versions if available
    const enrichedTop20 = top20Results.map(
      (show) => enrichedMap.get(show.id) || show
    );

    // Combine enriched top 20 with remaining results and re-sort to maintain popularity order
    const enrichedResults = [...enrichedTop20, ...remainingResults];
    const finalSortedResults = sortShowsByPopularity(enrichedResults);

    // Limit results only for dropdown (when maxResults is low)
    // For search page pagination, return all results to maintain consistent page sizes
    const limitedResults =
      maxResults >= 100
        ? finalSortedResults
        : finalSortedResults.slice(0, maxResults);

    const sortedData: TMDBResponse = {
      ...searchData,
      results: limitedResults,
    };

    // Cache the result (client-side)
    if (typeof window !== 'undefined') {
      clientCache.set(cacheKey, sortedData, CACHE_TTL.SEARCH);
    }

    return sortedData;
  } catch (error) {
    console.error('Error searching shows:', error);
    return { results: [], page: 1, total_pages: 0, total_results: 0 };
  }
}

// Get IMDB rating from OMDB API
async function getIMDBRating(imdbId: string): Promise<number | null> {
  if (!OMDB_API_KEY) {
    console.warn(
      'OMDB API key not configured. IMDB ratings will not be available.'
    );
    return null;
  }

  try {
    const response = await fetch(
      `${OMDB_BASE_URL}/?i=${imdbId}&apikey=${OMDB_API_KEY}`,
      {
        next: { revalidate: 3600 }, // Revalidate every hour
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
    console.error('Error fetching IMDB rating:', error);
    return null;
  }
}

// Enrich a show with IMDB rating (for list views)
async function enrichShowWithIMDBRating(
  show: Show,
  mediaType: 'movie' | 'tv'
): Promise<Show> {
  // If already has IMDB rating, return as is
  if (show.imdb_rating !== undefined) {
    return show;
  }

  try {
    // Get external IDs to find IMDB ID
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
    // Silently fail - we'll just use TMDB rating
    console.error('Error enriching show with IMDB rating:', error);
  }

  return show;
}

// Enrich multiple shows with IMDB ratings (batched, with rate limiting)
async function enrichShowsWithIMDBRatings(
  shows: Show[],
  mediaType: 'movie' | 'tv'
): Promise<Show[]> {
  // Limit to first 20 shows to avoid too many API calls
  const showsToEnrich = shows.slice(0, 20);
  const remainingShows = shows.slice(20);

  // Process in batches of 5 to avoid rate limiting
  const batchSize = 5;
  const enrichedShows: Show[] = [];

  for (let i = 0; i < showsToEnrich.length; i += batchSize) {
    const batch = showsToEnrich.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map((show) => enrichShowWithIMDBRating(show, mediaType))
    );
    enrichedShows.push(...enrichedBatch);
  }

  return [...enrichedShows, ...remainingShows];
}

// Get show details with caching and IMDB rating
export const getShowDetails = cache(
  async (id: number, mediaType: 'movie' | 'tv'): Promise<Show | null> => {
    try {
      const [showResponse, externalIdsResponse] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}`, {
          next: { revalidate: 3600 }, // Revalidate every hour
        }),
        fetch(
          `${TMDB_BASE_URL}/${mediaType}/${id}/external_ids?api_key=${TMDB_API_KEY}`,
          {
            next: { revalidate: 3600 },
          }
        ),
      ]);

      if (!showResponse.ok) {
        throw new Error('Failed to fetch show details');
      }

      const data: Show = await showResponse.json();
      const show: Show = normalizeShow(data, mediaType);

      // Get IMDB ID and rating
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

      return show;
    } catch (error) {
      console.error('Error fetching show details:', error);
      return null;
    }
  }
);

// Get watch providers for a show with caching
// countryCode defaults to 'US' but can be changed (e.g., 'GB', 'CA', 'AU')
export const getWatchProviders = cache(
  async (
    id: number,
    mediaType: 'movie' | 'tv',
    countryCode: string = 'US'
  ): Promise<WatchProviders | null> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${id}/watch/providers?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 86400 }, // Revalidate every 24 hours
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch watch providers');
      }

      const data: WatchProvidersResponse = await response.json();
      return data.results[countryCode] || null;
    } catch (error) {
      console.error('Error fetching watch providers:', error);
      return null;
    }
  }
);

// Get provider logo URL
export function getProviderLogoUrl(logoPath: string | null): string {
  if (!logoPath) {
    return '/placeholder-provider.png';
  }
  return `https://image.tmdb.org/t/p/w45${logoPath}`;
}

// Cast member interface
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

// Credits response interface
export interface CreditsResponse {
  id: number;
  cast: CastMember[];
  crew: any[];
}

// Get cast/credits for a show with caching
export const getShowCredits = cache(
  async (
    id: number,
    mediaType: 'movie' | 'tv'
  ): Promise<CastMember[] | null> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${id}/credits?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Revalidate every hour
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch show credits');
      }

      const data: CreditsResponse = await response.json();
      // Return cast sorted by order (main cast first)
      return data.cast.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Error fetching show credits:', error);
      return null;
    }
  }
);

// Get profile image URL
export function getProfileUrl(profilePath: string | null): string {
  if (!profilePath) {
    return '/placeholder-profile.png';
  }
  return `https://image.tmdb.org/t/p/w185${profilePath}`;
}

// Get larger profile image URL for actor pages
export function getProfileUrlLarge(profilePath: string | null): string {
  if (!profilePath) {
    return '/placeholder-profile.png';
  }
  return `https://image.tmdb.org/t/p/w500${profilePath}`;
}

// Actor details interface
export interface ActorDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  popularity: number;
}

// Actor credits response interface
export interface ActorCreditsResponse {
  cast: Show[];
  crew: any[];
}

// Get actor details with caching
export const getActorDetails = cache(
  async (id: number): Promise<ActorDetails | null> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/person/${id}?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Revalidate every hour
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch actor details');
      }

      const data: ActorDetails = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching actor details:', error);
      return null;
    }
  }
);

// Helper function to fetch show details with IMDB rating (not cached, for use in loops)
// Uses append_to_response to get external_ids in a single call
async function fetchShowDetailsWithIMDB(
  id: number,
  mediaType: 'movie' | 'tv'
): Promise<Show | null> {
  try {
    // Use append_to_response to get external_ids in the same call
    const showResponse = await fetch(
      `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`,
      {
        next: { revalidate: 3600 }, // Revalidate every hour
      }
    );

    if (!showResponse.ok) {
      return null;
    }

    const data: any = await showResponse.json();
    const show: Show = normalizeShow(data, mediaType);

    // Get IMDB ID and rating from the appended external_ids
    if (data.external_ids?.imdb_id) {
      const imdbId = data.external_ids.imdb_id;
      show.imdb_id = imdbId;
      const imdbRating = await getIMDBRating(imdbId);
      if (imdbRating !== null) {
        show.imdb_rating = imdbRating;
      }
    }

    return show;
  } catch (error) {
    console.error(`Error fetching show details for ${mediaType}/${id}:`, error);
    return null;
  }
}

// Get actor's basic credits (fast, no IMDB ratings) - uses data directly from credits endpoint
export const getActorCreditsBasic = cache(
  async (id: number): Promise<Show[]> => {
    try {
      const [movieCreditsRes, tvCreditsRes] = await Promise.all([
        fetch(
          `${TMDB_BASE_URL}/person/${id}/movie_credits?api_key=${TMDB_API_KEY}`,
          {
            next: { revalidate: 3600 }, // Revalidate every hour
          }
        ),
        fetch(
          `${TMDB_BASE_URL}/person/${id}/tv_credits?api_key=${TMDB_API_KEY}`,
          {
            next: { revalidate: 3600 },
          }
        ),
      ]);

      if (!movieCreditsRes.ok || !tvCreditsRes.ok) {
        throw new Error('Failed to fetch actor credits');
      }

      const movieCredits: ActorCreditsResponse = await movieCreditsRes.json();
      const tvCredits: ActorCreditsResponse = await tvCreditsRes.json();

      // Normalize movie credits directly from the credits endpoint
      const movieShows = (movieCredits.cast || []).map((movie: any) =>
        normalizeShow(
          {
            id: movie.id,
            title: movie.title,
            name: movie.title,
            overview: movie.overview || '',
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average || 0,
            vote_count: movie.vote_count,
            popularity: movie.popularity,
            revenue: movie.revenue || 0,
            order: movie.order ?? 999,
            episode_count: 0,
          },
          'movie'
        )
      );

      // Normalize TV credits directly from the credits endpoint
      const tvShows = (tvCredits.cast || []).map((show: any) =>
        normalizeShow(
          {
            id: show.id,
            title: show.name,
            name: show.name,
            overview: show.overview || '',
            poster_path: show.poster_path,
            backdrop_path: show.backdrop_path,
            first_air_date: show.first_air_date,
            vote_average: show.vote_average || 0,
            vote_count: show.vote_count,
            popularity: show.popularity,
            revenue: 0,
            order: show.order ?? 999,
            episode_count: show.episode_count || 0,
          },
          'tv'
        )
      );

      // Combine and remove duplicates (same ID and media type)
      const allShows = [...movieShows, ...tvShows];
      const uniqueShows = allShows.filter(
        (show, index, self) =>
          index ===
          self.findIndex(
            (s) => s.id === show.id && s.media_type === show.media_type
          )
      );

      return uniqueShows;
    } catch (error) {
      console.error('Error fetching actor credits:', error);
      return [];
    }
  }
);

// Enrich actor credits with IMDB ratings (slow operation, use in Suspense)
export const enrichActorCreditsWithIMDBRatings = cache(
  async (shows: Show[]): Promise<Show[]> => {
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    const enrichedShows: Show[] = [];

    for (let i = 0; i < shows.length; i += batchSize) {
      const batch = shows.slice(i, i + batchSize);
      const enrichedBatch = await Promise.all(
        batch.map(async (show) => {
          // Skip if already has IMDB rating
          if (show.imdb_rating !== undefined) {
            return show;
          }

          const mediaType = show.media_type || 'movie';
          let enrichedShow = { ...show };

          try {
            // Get external IDs to find IMDB ID
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
                enrichedShow.imdb_id = imdbId;
                const imdbRating = await getIMDBRating(imdbId);
                if (imdbRating !== null) {
                  enrichedShow.imdb_rating = imdbRating;
                }
              }
            }
          } catch (error) {
            // Silently fail - we'll just use TMDB rating
            console.error(
              `Error enriching show ${show.id} with IMDB rating:`,
              error
            );
          }

          return enrichedShow;
        })
      );

      enrichedShows.push(...enrichedBatch);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < shows.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return enrichedShows;
  }
);

// Get actor's combined credits (movies + TV shows) with caching
// Fetches full show details with IMDB ratings using the same approach as home page
// DEPRECATED: Use getActorCreditsBasic + enrichActorCreditsWithIMDBRatings for better performance
export const getActorCredits = cache(async (id: number): Promise<Show[]> => {
  try {
    const [movieCreditsRes, tvCreditsRes] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/person/${id}/movie_credits?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Revalidate every hour
        }
      ),
      fetch(
        `${TMDB_BASE_URL}/person/${id}/tv_credits?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 },
        }
      ),
    ]);

    if (!movieCreditsRes.ok || !tvCreditsRes.ok) {
      throw new Error('Failed to fetch actor credits');
    }

    const movieCredits: ActorCreditsResponse = await movieCreditsRes.json();
    const tvCredits: ActorCreditsResponse = await tvCreditsRes.json();

    // Extract credit info (ID, order, episode_count, revenue) from credits endpoint
    const movieCreditInfo = (movieCredits.cast || []).map((movie: any) => ({
      id: movie.id,
      mediaType: 'movie' as const,
      order: movie.order ?? 999,
      revenue: movie.revenue || 0,
      episode_count: 0,
    }));

    const tvCreditInfo = (tvCredits.cast || []).map((show: any) => ({
      id: show.id,
      mediaType: 'tv' as const,
      order: show.order ?? 999,
      revenue: 0,
      episode_count: show.episode_count || 0,
    }));

    // Combine all credit info
    const allCreditInfo = [...movieCreditInfo, ...tvCreditInfo];

    // Remove duplicates (same ID and media type)
    const uniqueCreditInfo = allCreditInfo.filter(
      (credit, index, self) =>
        index ===
        self.findIndex(
          (c) => c.id === credit.id && c.mediaType === credit.mediaType
        )
    );

    // Fetch full show details with IMDB ratings
    // Process in batches to avoid too many concurrent requests
    const batchSize = 5; // Smaller batch size to avoid rate limiting
    const allShows: Show[] = [];

    for (let i = 0; i < uniqueCreditInfo.length; i += batchSize) {
      const batch = uniqueCreditInfo.slice(i, i + batchSize);
      const showPromises = batch.map(async (creditInfo) => {
        const show = await fetchShowDetailsWithIMDB(
          creditInfo.id,
          creditInfo.mediaType
        );
        if (show) {
          // Merge credit-specific fields with full show data
          return normalizeShow(
            {
              ...show,
              order: creditInfo.order,
              revenue: creditInfo.revenue,
              episode_count: creditInfo.episode_count,
            },
            creditInfo.mediaType
          );
        }
        return null;
      });

      const batchResults = await Promise.all(showPromises);
      allShows.push(
        ...batchResults.filter((show): show is Show => show !== null)
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < uniqueCreditInfo.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return allShows;
  } catch (error) {
    console.error('Error fetching actor credits:', error);
    return [];
  }
});
