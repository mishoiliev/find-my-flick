import { cache } from 'react';
import {
  cache as clientCache,
  getPopularActorsCacheKey,
  getPopularShowsCacheKey,
  getSearchCacheKey,
} from './cache';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  media_type?: 'movie' | 'tv';
  revenue?: number; // Box office revenue for movies
  order?: number; // Role order/importance in cast (lower = more important, used for actor credits)
  episode_count?: number; // Number of episodes actor appeared in (for TV shows)
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

// Get the display title (handles both movies and TV shows)
export function getShowTitle(show: Show): string {
  return show.title || show.name || 'Unknown';
}

// Get the release date (handles both movies and TV shows)
export function getShowDate(show: Show): string {
  return show.release_date || show.first_air_date || 'Unknown';
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

    // Combine and mark media type
    const movies = moviesData.results.map((m) => ({
      ...m,
      media_type: 'movie' as const,
    }));
    const tvShows = tvData.results.map((t) => ({
      ...t,
      media_type: 'tv' as const,
    }));

    // Combine and shuffle for variety
    const allShows = [...movies, ...tvShows];
    return allShows.slice(0, 20); // Return top 20
  } catch (error) {
    console.error('Error fetching popular shows:', error);
    return [];
  }
});

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

    // Combine movie and TV results, marking media types
    const combinedResults: Show[] = [
      ...movieData.results.map((m) => ({ ...m, media_type: 'movie' as const })),
      ...tvData.results.map((t) => ({ ...t, media_type: 'tv' as const })),
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
          const movies = (movieCredits.cast || []).map((movie: any) => ({
            ...movie,
            media_type: 'movie' as const,
          }));
          actorMovies.push(...movies);
        }

        if (tvCreditsRes.ok) {
          const tvCredits = await tvCreditsRes.json();
          const tvShows = (tvCredits.cast || []).map((show: any) => ({
            ...show,
            media_type: 'tv' as const,
          }));
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

    // Sort all results by popularity
    const sortedResults = sortShowsByPopularity(allResults);

    // Limit results only for dropdown (when maxResults is low)
    // For search page pagination, return all results to maintain consistent page sizes
    const limitedResults =
      maxResults >= 100 ? sortedResults : sortedResults.slice(0, maxResults);

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

// Get show details with caching
export const getShowDetails = cache(
  async (id: number, mediaType: 'movie' | 'tv'): Promise<Show | null> => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 }, // Revalidate every hour
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch show details');
      }

      const data: Show = await response.json();
      return { ...data, media_type: mediaType };
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

// Get actor's combined credits (movies + TV shows) with caching
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

    // Combine and mark media types, preserving revenue for movies and order for role importance
    const movies = (movieCredits.cast || []).map((movie: any) => ({
      ...movie,
      media_type: 'movie' as const,
      revenue: movie.revenue || 0, // Preserve revenue for movies
      order: movie.order ?? 999, // Preserve order (role importance), default to 999 if missing
      episode_count: 0, // Movies don't have episodes
    }));
    const tvShows = (tvCredits.cast || []).map((show: any) => ({
      ...show,
      media_type: 'tv' as const,
      revenue: 0, // TV shows don't have box office revenue
      order: show.order ?? 999, // Preserve order (role importance), default to 999 if missing
      episode_count: show.episode_count || 0, // Preserve episode count for TV shows
    }));

    // Combine all credits
    const allCredits = [...movies, ...tvShows];

    // Remove duplicates (same ID and media type)
    const uniqueCredits = allCredits.filter(
      (credit, index, self) =>
        index ===
        self.findIndex(
          (c) => c.id === credit.id && c.media_type === credit.media_type
        )
    );

    return uniqueCredits;
  } catch (error) {
    console.error('Error fetching actor credits:', error);
    return [];
  }
});
