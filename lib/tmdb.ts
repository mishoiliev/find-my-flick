// Types and utility functions
// NOTE: Server-side functions call TMDB directly to avoid function invocations.
// API routes in /app/api/tmdb/* are kept for client-side usage only.

export interface Genre {
  id: number;
  name: string;
}

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
  genres?: Genre[]; // Genres for the show
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

// Genre mappings for movies and TV shows (from TMDB API)
export const MOVIE_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

// Convert genre_ids array to Genre objects
function convertGenreIdsToGenres(
  genreIds: number[] | undefined,
  mediaType: 'movie' | 'tv'
): Genre[] | undefined {
  if (!genreIds || genreIds.length === 0) {
    return undefined;
  }

  const genreMap = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;
  return genreIds
    .map((id) => {
      const name = genreMap[id];
      return name ? { id, name } : null;
    })
    .filter((genre): genre is Genre => genre !== null);
}

// Normalize a show object to ensure consistency across all pages
// This ensures all Show objects have the same structure regardless of source
export function normalizeShow(
  show: Partial<Show> & { genre_ids?: number[] },
  mediaType: 'movie' | 'tv'
): Show {
  // Validate required fields
  if (!show || typeof show.id !== 'number') {
    throw new Error(
      `Invalid show data: missing or invalid id. Show: ${JSON.stringify(show)}`
    );
  }

  // TMDB returns 'title' for movies and 'name' for TV shows
  // We ensure both fields are populated for consistency
  const title = show.title || show.name || '';
  const name = show.name || show.title || undefined;

  // Handle genres: prefer full genres array, fall back to converting genre_ids
  let genres: Genre[] | undefined = show.genres;
  if (!genres && show.genre_ids) {
    genres = convertGenreIdsToGenres(show.genre_ids, mediaType);
  }

  return {
    id: show.id,
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
    genres,
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

// Get the rating (uses TMDB vote_average)
export function getShowRating(show: Show): number {
  return show.vote_average;
}

// Get poster image URL - returns full TMDB URL with optimal size
// With unoptimized: true, we use TMDB's pre-sized images directly
export function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) {
    return null; // Return null instead of non-existent placeholder
  }
  // Return full TMDB URL with w500 size (good balance of quality and file size)
  const path = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

// Get backdrop image URL - returns full TMDB URL with optimal size
export function getBackdropUrl(backdropPath: string | null): string | null {
  if (!backdropPath) {
    return null; // Return null instead of non-existent placeholder
  }
  // Return full TMDB URL with w1280 size (good for backdrops)
  const path = backdropPath.startsWith('/') ? backdropPath : `/${backdropPath}`;
  return `https://image.tmdb.org/t/p/w1280${path}`;
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

// Get provider logo URL - returns full TMDB URL
export function getProviderLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) {
    return null; // Return null instead of non-existent placeholder
  }
  const path = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;
  return `https://image.tmdb.org/t/p/w45${path}`;
}

// Get profile image URL - returns full TMDB URL
export function getProfileUrl(profilePath: string | null): string | null {
  if (!profilePath) {
    return null; // Return null instead of non-existent placeholder
  }
  const path = profilePath.startsWith('/') ? profilePath : `/${profilePath}`;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

// Get larger profile image URL for actor pages - returns full TMDB URL
export function getProfileUrlLarge(profilePath: string | null): string | null {
  if (!profilePath) {
    return null; // Return null instead of non-existent placeholder
  }
  const path = profilePath.startsWith('/') ? profilePath : `/${profilePath}`;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

// ============================================================================
// SERVER-SIDE API WRAPPER FUNCTIONS
// These functions call the API routes and should ONLY be used in server components/actions
// ============================================================================

import { cache } from 'react';

// Helper to get base URL for API calls (server-side only)
// Uses relative URLs for internal API calls, which Next.js handles automatically
function getBaseUrl(): string {
  // In server components, we can use relative URLs for internal API routes
  // Next.js will automatically resolve them to the correct absolute URL
  // However, for some edge cases, we may need an absolute URL

  // In development, always use localhost (ignore production env vars)
  if (process.env.NODE_ENV !== 'production') {
    // Check for PORT environment variable (used when running PORT=3001 bun run dev)
    // Next.js dev server respects the PORT env var
    const port = process.env.PORT || '3000';
    return `http://localhost:${port}`;
  }

  // In production, use environment variables if available
  // Use NEXT_PUBLIC_SITE_URL if available (set in environment variables)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    let url = process.env.NEXT_PUBLIC_SITE_URL.trim();
    // Ensure it has a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    // Ensure it doesn't end with a slash
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  // In Vercel production, use VERCEL_URL if available
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.trim();
    // VERCEL_URL might already include protocol or might not
    if (vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')) {
      return vercelUrl;
    }
    return `https://${vercelUrl}`;
  }

  // Fallback to production URL
  return 'https://findmyflick.space';
}

// Fetch popular shows (both movies and TV) with caching
// Calls TMDB directly to avoid function invocations from internal API routes
export const fetchPopularShows = cache(
  async (limit: number = 20): Promise<Show[]> => {
    try {
      const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
      const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

      // Fetch both movies and TV shows
      const [moviesRes, tvRes] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`, {
          next: { revalidate: 1800 },
        }),
        fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`, {
          next: { revalidate: 1800 },
        }),
      ]);

      const allResults: any[] = [];

      if (moviesRes.ok) {
        const moviesData = await moviesRes.json();
        const movies = (moviesData.results || []).map((m: any) => ({
          ...m,
          media_type: 'movie',
          title: m.title || m.name,
          name: m.name || m.title,
        }));
        allResults.push(...movies);
      }

      if (tvRes.ok) {
        const tvData = await tvRes.json();
        const tvShows = (tvData.results || []).map((t: any) => ({
          ...t,
          media_type: 'tv',
          title: t.name || t.title,
          name: t.name || t.title,
        }));
        allResults.push(...tvShows);
      }

      // Remove duplicates, sort by popularity, and limit
      const seen = new Set<string>();
      const unique = allResults.filter((show) => {
        const key = `${show.media_type}-${show.id}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      unique.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      const limited = unique.slice(0, limit);

      return limited.map((show: any) =>
        normalizeShow(show, show.media_type || 'movie')
      );
    } catch (error) {
      console.error('Error fetching popular shows:', error);
      return [];
    }
  }
);

// Fetch popular movies only with caching
// Calls TMDB directly to avoid function invocations from internal API routes
export const fetchPopularMovies = cache(async (): Promise<Show[]> => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 1800 }, // Cache for 30 minutes
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(
        `Failed to fetch popular movies: ${response.status} ${errorText}`
      );
      return [];
    }

    const data = await response.json();
    if (!data.results) {
      console.error('Invalid response format from TMDB:', data);
      return [];
    }
    return data.results.map((show: any) => normalizeShow(show, 'movie'));
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
});

// Fetch top-rated movies
// Calls TMDB directly to avoid function invocations from internal API routes
export const fetchTopRatedMovies = cache(async (): Promise<Show[]> => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 1800 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch top-rated movies');
    }

    const data = await response.json();
    return data.results.map((show: any) => normalizeShow(show, 'movie'));
  } catch (error) {
    console.error('Error fetching top-rated movies:', error);
    return [];
  }
});

// Fetch popular TV shows only with caching
// Calls TMDB directly to avoid function invocations from internal API routes
export const fetchPopularTVShows = cache(async (): Promise<Show[]> => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    const response = await fetch(
      `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 1800 }, // Cache for 30 minutes
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(
        `Failed to fetch popular TV shows: ${response.status} ${errorText}`
      );
      return [];
    }

    const data = await response.json();
    if (!data.results) {
      console.error('Invalid response format from TMDB:', data);
      return [];
    }
    return data.results.map((show: any) => normalizeShow(show, 'tv'));
  } catch (error) {
    console.error('Error fetching popular TV shows:', error);
    return [];
  }
});

// Fetch top-rated TV shows
// Calls TMDB directly to avoid function invocations from internal API routes
export const fetchTopRatedTVShows = cache(async (): Promise<Show[]> => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    const response = await fetch(
      `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 1800 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch top-rated TV shows');
    }

    const data = await response.json();
    return data.results.map((show: any) => normalizeShow(show, 'tv'));
  } catch (error) {
    console.error('Error fetching top-rated TV shows:', error);
    return [];
  }
});

// Fetch trending movies
export const fetchTrendingMovies = cache(
  async (timeWindow: 'day' | 'week' = 'week'): Promise<Show[]> => {
    // Note: This would need a separate API route for trending
    // For now, fallback to popular
    return fetchPopularMovies();
  }
);

// Fetch trending TV shows
export const fetchTrendingTVShows = cache(
  async (timeWindow: 'day' | 'week' = 'week'): Promise<Show[]> => {
    // Note: This would need a separate API route for trending
    // For now, fallback to popular
    return fetchPopularTVShows();
  }
);

// Fetch popular actors (250 most popular)
// Calls TMDB directly to avoid function invocations from internal API routes
export const fetchPopularActors = cache(async (): Promise<Actor[]> => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    // Fetch multiple pages to get 250 actors (20 per page, need 13 pages)
    const pages = Array.from({ length: 13 }, (_, i) => i + 1);
    const responses = await Promise.all(
      pages.map((page) =>
        fetch(
          `${TMDB_BASE_URL}/person/popular?api_key=${TMDB_API_KEY}&page=${page}`,
          {
            next: { revalidate: 86400 }, // Cache for 24 hours
          }
        )
      )
    );

    const allActors: Actor[] = [];
    for (const res of responses) {
      if (res.ok) {
        const data = await res.json();
        allActors.push(...(data.results || []));
      }
    }

    // Return first 250 actors
    return allActors.slice(0, 250);
  } catch (error) {
    console.error('Error fetching popular actors:', error);
    return [];
  }
});

// Search shows with caching
// Calls TMDB directly to avoid function invocations from internal API routes
export async function searchShows(
  query: string,
  page: number = 1,
  maxResults: number = 30
): Promise<TMDBResponse> {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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

    const finalResults = combinedResults.slice(0, maxResults);

    return {
      results: finalResults.map((show: any) =>
        normalizeShow(show, show.media_type || 'movie')
      ),
      page: parseInt(page.toString()),
      total_pages: Math.max(calculatedTotalPages, maxTotalPages),
      total_results: combinedTotal,
    };
  } catch (error) {
    console.error('Error searching shows:', error);
    return { results: [], page: 1, total_pages: 0, total_results: 0 };
  }
}

// Discover shows by genre with caching
// Directly calls the discover logic instead of making HTTP request
export const discoverShowsByGenre = cache(
  async (
    genreIds: number[],
    type: 'all' | 'movie' | 'tv' = 'all',
    page: number = 1,
    maxResults: number = 50
  ): Promise<TMDBResponse> => {
    try {
      const { discoverShowsByGenreLogic } = await import('./discover');
      const genreIdsString = genreIds.map(String);
      const result = await discoverShowsByGenreLogic(
        genreIdsString,
        type,
        String(page),
        maxResults
      );

      return {
        results: result.results.map((show: any) =>
          normalizeShow(show, show.media_type || 'movie')
        ),
        page: result.page,
        total_pages: result.total_pages,
        total_results: result.total_results,
      };
    } catch (error) {
      console.error('Error discovering shows by genre:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Full error details:', errorMessage);
      return { results: [], page: 1, total_pages: 0, total_results: 0 };
    }
  }
);

// Get show details with caching
export const getShowDetails = cache(
  async (id: number, mediaType: 'movie' | 'tv'): Promise<Show | null> => {
    try {
      const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
      const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

      const response = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMessage = 'Failed to fetch show details';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (errorText && errorText !== 'Unknown error') {
            errorMessage = errorText;
          }
        }
        console.error(
          `Failed to fetch show details: ${response.status} ${response.statusText} - ${errorMessage}`
        );
        return null;
      }

      const data = await response.json();

      if (!data || !data.id) {
        console.error('Invalid data received from TMDB:', {
          id,
          mediaType,
          hasData: !!data,
          dataId: data?.id,
        });
        return null;
      }

      try {
        return normalizeShow(data, mediaType);
      } catch (normalizeError) {
        console.error('Error normalizing show data:', {
          error: normalizeError,
          id,
          mediaType,
          dataKeys: data ? Object.keys(data) : [],
        });
        return null;
      }
    } catch (error) {
      console.error('Error fetching show details:', error);
      return null;
    }
  }
);

// Get watch providers for a show with caching
// Calls TMDB directly to avoid function invocations from internal API routes
export const getWatchProviders = cache(
  async (
    id: number,
    mediaType: 'movie' | 'tv',
    countryCode: string = 'US'
  ): Promise<WatchProviders | null> => {
    try {
      const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
      const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

      const response = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${id}/watch/providers?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 86400 }, // Cache for 24 hours
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch watch providers');
      }

      const data = await response.json();
      return data.results?.[countryCode] || null;
    } catch (error) {
      console.error('Error fetching watch providers:', error);
      return null;
    }
  }
);

// Get cast/credits for a show with caching
// Calls TMDB directly to avoid function invocations from internal API routes
export const getShowCredits = cache(
  async (
    id: number,
    mediaType: 'movie' | 'tv'
  ): Promise<CastMember[] | null> => {
    try {
      const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
      const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

      const response = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${id}/credits?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch show credits');
      }

      const data = await response.json();
      return data.cast || [];
    } catch (error) {
      console.error('Error fetching show credits:', error);
      return null;
    }
  }
);

// Get actor details with caching
// Calls TMDB directly to avoid function invocations from internal API routes
export const getActorDetails = cache(
  async (id: number): Promise<ActorDetails | null> => {
    try {
      const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
      const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

      const response = await fetch(
        `${TMDB_BASE_URL}/person/${id}?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch actor details');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching actor details:', error);
      return null;
    }
  }
);

// Get actor's basic credits
// Calls TMDB directly to avoid function invocations from internal API routes
export const getActorCreditsBasic = cache(
  async (id: number): Promise<Show[]> => {
    try {
      const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
      const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

      const response = await fetch(
        `${TMDB_BASE_URL}/person/${id}/combined_credits?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch actor credits');
      }

      const data = await response.json();
      const allCredits = [
        ...(data.cast || []).map((show: any) => ({
          ...show,
          media_type: show.media_type || (show.title ? 'movie' : 'tv'),
        })),
      ];

      return allCredits.map((show: any) =>
        normalizeShow(show, show.media_type || 'movie')
      );
    } catch (error) {
      console.error('Error fetching actor credits:', error);
      return [];
    }
  }
);

// Get actor's combined credits (movies + TV shows) with caching
// Calls TMDB directly to avoid function invocations from internal API routes
export const getActorCredits = cache(async (id: number): Promise<Show[]> => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    const response = await fetch(
      `${TMDB_BASE_URL}/person/${id}/combined_credits?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch actor credits');
    }

    const data = await response.json();
    const allCredits = [
      ...(data.cast || []).map((show: any) => ({
        ...show,
        media_type: show.media_type || (show.title ? 'movie' : 'tv'),
      })),
    ];

    return allCredits.map((show: any) =>
      normalizeShow(show, show.media_type || 'movie')
    );
  } catch (error) {
    console.error('Error fetching actor credits:', error);
    return [];
  }
});
