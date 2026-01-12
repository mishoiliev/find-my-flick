// Types and utility functions only - NO API KEYS OR FETCH CALLS
// All API calls should go through /app/api/tmdb/* routes

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
  return `https://image.tmdb.org/t/p/w500${posterPath}`;
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

// Get provider logo URL
export function getProviderLogoUrl(logoPath: string | null): string {
  if (!logoPath) {
    return '/placeholder-provider.png';
  }
  return `https://image.tmdb.org/t/p/w45${logoPath}`;
}

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

// ============================================================================
// SERVER-SIDE API WRAPPER FUNCTIONS
// These functions call the API routes and should ONLY be used in server components/actions
// ============================================================================

import { cache } from 'react';

// Helper to get base URL for API calls (server-side only)
function getBaseUrl(): string {
  // In production, use VERCEL_URL if available
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback to localhost for development
  return 'http://localhost:3000';
}

// Fetch popular shows (both movies and TV) with caching
export const fetchPopularShows = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(`${getBaseUrl()}/api/tmdb/popular?type=all`, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch popular shows');
    }

    const data = await response.json();
    return data.results.map((show: any) =>
      normalizeShow(show, show.media_type || 'movie')
    );
  } catch (error) {
    console.error('Error fetching popular shows:', error);
    return [];
  }
});

// Fetch popular movies only with caching
export const fetchPopularMovies = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/tmdb/popular?type=movie`,
      {
        next: { revalidate: 1800 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch popular movies');
    }

    const data = await response.json();
    return data.results.map((show: any) => normalizeShow(show, 'movie'));
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
});

// Fetch top-rated movies
export const fetchTopRatedMovies = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/tmdb/popular?type=movie`,
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
export const fetchPopularTVShows = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(`${getBaseUrl()}/api/tmdb/popular?type=tv`, {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch popular TV shows');
    }

    const data = await response.json();
    return data.results.map((show: any) => normalizeShow(show, 'tv'));
  } catch (error) {
    console.error('Error fetching popular TV shows:', error);
    return [];
  }
});

// Fetch top-rated TV shows
export const fetchTopRatedTVShows = cache(async (): Promise<Show[]> => {
  try {
    const response = await fetch(`${getBaseUrl()}/api/tmdb/popular?type=tv`, {
      next: { revalidate: 1800 },
    });

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
export const fetchPopularActors = cache(async (): Promise<Actor[]> => {
  try {
    const response = await fetch(`${getBaseUrl()}/api/tmdb/actors/popular`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch popular actors');
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching popular actors:', error);
    return [];
  }
});

// Search shows with caching
export async function searchShows(
  query: string,
  page: number = 1,
  maxResults: number = 30
): Promise<TMDBResponse> {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/tmdb/search?q=${encodeURIComponent(
        query
      )}&page=${page}&maxResults=${maxResults}`,
      {
        next: { revalidate: 600 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search shows');
    }

    const data = await response.json();
    return {
      results: data.results.map((show: any) =>
        normalizeShow(show, show.media_type || 'movie')
      ),
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
    };
  } catch (error) {
    console.error('Error searching shows:', error);
    return { results: [], page: 1, total_pages: 0, total_results: 0 };
  }
}

// Get show details with caching and IMDB rating
export const getShowDetails = cache(
  async (id: number, mediaType: 'movie' | 'tv'): Promise<Show | null> => {
    try {
      const response = await fetch(
        `${getBaseUrl()}/api/tmdb/show/${mediaType}/${id}`,
        {
          next: { revalidate: 3600 },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch show details');
      }

      const data = await response.json();
      return normalizeShow(data, mediaType);
    } catch (error) {
      console.error('Error fetching show details:', error);
      return null;
    }
  }
);

// Get watch providers for a show with caching
export const getWatchProviders = cache(
  async (
    id: number,
    mediaType: 'movie' | 'tv',
    countryCode: string = 'US'
  ): Promise<WatchProviders | null> => {
    try {
      const response = await fetch(
        `${getBaseUrl()}/api/tmdb/show/${mediaType}/${id}/watch-providers?country=${countryCode}`,
        {
          next: { revalidate: 86400 },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch watch providers');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching watch providers:', error);
      return null;
    }
  }
);

// Get cast/credits for a show with caching
export const getShowCredits = cache(
  async (
    id: number,
    mediaType: 'movie' | 'tv'
  ): Promise<CastMember[] | null> => {
    try {
      const response = await fetch(
        `${getBaseUrl()}/api/tmdb/show/${mediaType}/${id}/credits`,
        {
          next: { revalidate: 3600 },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch show credits');
      }

      const data = await response.json();
      return data.cast;
    } catch (error) {
      console.error('Error fetching show credits:', error);
      return null;
    }
  }
);

// Get actor details with caching
export const getActorDetails = cache(
  async (id: number): Promise<ActorDetails | null> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/tmdb/actor/${id}`, {
        next: { revalidate: 3600 },
      });

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

// Get actor's basic credits (fast, no IMDB ratings)
export const getActorCreditsBasic = cache(
  async (id: number): Promise<Show[]> => {
    try {
      const response = await fetch(
        `${getBaseUrl()}/api/tmdb/actor/${id}/credits`,
        {
          next: { revalidate: 3600 },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch actor credits');
      }

      const data = await response.json();
      return data.credits.map((show: any) =>
        normalizeShow(show, show.media_type || 'movie')
      );
    } catch (error) {
      console.error('Error fetching actor credits:', error);
      return [];
    }
  }
);

// Enrich actor credits with IMDB ratings (slow operation, use in Suspense)
export const enrichActorCreditsWithIMDBRatings = cache(
  async (shows: Show[]): Promise<Show[]> => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/tmdb/shows/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shows }),
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        throw new Error('Failed to enrich shows');
      }

      const data = await response.json();
      return data.shows.map((show: any) =>
        normalizeShow(show, show.media_type || 'movie')
      );
    } catch (error) {
      console.error('Error enriching shows:', error);
      // Return original shows if enrichment fails
      return shows;
    }
  }
);

// Get actor's combined credits (movies + TV shows) with caching
// DEPRECATED: Use getActorCreditsBasic + enrichActorCreditsWithIMDBRatings for better performance
export const getActorCredits = cache(async (id: number): Promise<Show[]> => {
  try {
    const response = await fetch(
      `${getBaseUrl()}/api/tmdb/actor/${id}/credits?enriched=true`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch actor credits');
    }

    const data = await response.json();
    return data.credits.map((show: any) =>
      normalizeShow(show, show.media_type || 'movie')
    );
  } catch (error) {
    console.error('Error fetching actor credits:', error);
    return [];
  }
});
