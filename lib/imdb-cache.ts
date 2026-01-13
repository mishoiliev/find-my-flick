import { createClient, kv } from '@vercel/kv';

type ImdbRatingCacheValue = {
  rating: number;
  updatedAt: number;
};

type ImdbIdCacheValue = {
  imdbId: string;
  updatedAt: number;
};

let imdbKvClient: ReturnType<typeof createClient> | typeof kv | null = null;
const MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

export function getImdbKvClient() {
  if (imdbKvClient) {
    return imdbKvClient;
  }

  if (
    process.env.IMDB_RATINGS_KV_REST_API_URL &&
    process.env.IMDB_RATINGS_KV_REST_API_TOKEN
  ) {
    imdbKvClient = createClient({
      url: process.env.IMDB_RATINGS_KV_REST_API_URL,
      token: process.env.IMDB_RATINGS_KV_REST_API_TOKEN,
    });
    return imdbKvClient;
  }

  imdbKvClient = kv;
  return imdbKvClient;
}

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

function setMemoryCache<T>(key: string, value: T): void {
  memoryCache.set(key, { value, expiresAt: Date.now() + MEMORY_TTL_MS });
}

function cacheKey(prefix: string, id: string | number): string {
  return `${prefix}:${id}`;
}

function isKvEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  return Boolean(
    process.env.IMDB_RATINGS_KV_REST_API_URL &&
      process.env.IMDB_RATINGS_KV_REST_API_TOKEN
  );
}

export async function getCachedImdbRating(
  imdbId: string
): Promise<number | null> {
  if (!isKvEnabled()) {
    return null;
  }

  if (!isKvEnabled()) {
    return null;
  }

  const memoryKey = cacheKey('imdb:rating', imdbId);
  const cachedInMemory = getMemoryCache<ImdbRatingCacheValue | null>(memoryKey);
  if (cachedInMemory) {
    return cachedInMemory.rating ?? null;
  }

  try {
    const client = getImdbKvClient();
    const value = await client.get<ImdbRatingCacheValue>(
      `imdb:rating:${imdbId}`
    );
    if (value) {
      setMemoryCache(memoryKey, value);
    }
    return value?.rating ?? null;
  } catch (error: any) {
    // Handle Upstash rate limit or other errors gracefully
    if (
      error?.message?.includes('max requests limit') ||
      error?.message?.includes('rate limit')
    ) {
      console.warn('Upstash rate limit reached, skipping IMDB cache lookup');
    } else {
      console.error('Error fetching IMDB rating from cache:', error);
    }
    return null;
  }
}

export async function getCachedImdbRatings(
  imdbIds: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  if (!isKvEnabled()) {
    return results;
  }

  if (!isKvEnabled()) {
    return results;
  }

  const uniqueIds = Array.from(new Set(imdbIds)).filter(Boolean);
  const missingIds: string[] = [];

  uniqueIds.forEach((imdbId) => {
    const memoryKey = cacheKey('imdb:rating', imdbId);
    const cached = getMemoryCache<ImdbRatingCacheValue | null>(memoryKey);
    if (cached) {
      results.set(imdbId, cached.rating);
    } else {
      missingIds.push(imdbId);
    }
  });

  if (missingIds.length === 0) {
    return results;
  }

  try {
    const client = getImdbKvClient();
    const keys = missingIds.map((id) => `imdb:rating:${id}`);
    const values = await client.mget(...keys);

    values.forEach((value, index) => {
      const imdbId = missingIds[index];
      const typed = value as ImdbRatingCacheValue | null;
      if (typed && typeof typed.rating === 'number') {
        results.set(imdbId, typed.rating);
        setMemoryCache(cacheKey('imdb:rating', imdbId), typed);
      }
    });
  } catch (error: any) {
    // Handle Upstash rate limit or other errors gracefully
    if (
      error?.message?.includes('max requests limit') ||
      error?.message?.includes('rate limit')
    ) {
      console.warn(
        'Upstash rate limit reached, skipping IMDB ratings cache lookup'
      );
    } else {
      console.error('Error fetching IMDB ratings from cache:', error);
    }
    // Return whatever we got from memory cache
  }

  return results;
}

export async function setCachedImdbRatings(
  ratings: Map<string, number>
): Promise<void> {
  if (!isKvEnabled() || ratings.size === 0) {
    return;
  }

  const client = getImdbKvClient();
  const args: Array<string | ImdbRatingCacheValue> = [];
  const now = Date.now();

  ratings.forEach((rating, imdbId) => {
    const value: ImdbRatingCacheValue = { rating, updatedAt: now };
    args.push(`imdb:rating:${imdbId}`, value);
    setMemoryCache(cacheKey('imdb:rating', imdbId), value);
  });

  try {
    // @ts-expect-error - mset accepts variadic args but TypeScript requires tuple type
    await client.mset(...args);
  } catch (error: any) {
    // Handle Upstash rate limit or other errors gracefully
    if (
      error?.message?.includes('max requests limit') ||
      error?.message?.includes('rate limit')
    ) {
      console.warn(
        'Upstash rate limit reached, skipping IMDB ratings cache write'
      );
    } else {
      console.error('Error setting IMDB ratings cache:', error);
    }
    // Continue - memory cache is already updated
  }
}

export async function setCachedImdbRating(
  imdbId: string,
  rating: number
): Promise<void> {
  if (!isKvEnabled()) {
    return;
  }

  const value: ImdbRatingCacheValue = { rating, updatedAt: Date.now() };
  setMemoryCache(cacheKey('imdb:rating', imdbId), value);

  try {
    const client = getImdbKvClient();
    await client.set(`imdb:rating:${imdbId}`, value);
  } catch (error: any) {
    // Handle Upstash rate limit or other errors gracefully
    if (
      error?.message?.includes('max requests limit') ||
      error?.message?.includes('rate limit')
    ) {
      console.warn(
        'Upstash rate limit reached, skipping IMDB rating cache write'
      );
    } else {
      console.error('Error setting IMDB rating cache:', error);
    }
    // Continue - memory cache is already updated
  }
}

export async function getCachedImdbId(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<string | null> {
  if (!isKvEnabled()) {
    return null;
  }

  if (!isKvEnabled()) {
    return null;
  }

  const memoryKey = cacheKey(`imdb:map:${mediaType}`, tmdbId);
  const cachedInMemory = getMemoryCache<ImdbIdCacheValue | null>(memoryKey);
  if (cachedInMemory) {
    return cachedInMemory.imdbId ?? null;
  }

  try {
    const client = getImdbKvClient();
    const value = await client.get<ImdbIdCacheValue>(
      `imdb:map:${mediaType}:${tmdbId}`
    );
    if (value) {
      setMemoryCache(memoryKey, value);
    }
    return value?.imdbId ?? null;
  } catch (error: any) {
    // Handle Upstash rate limit or other errors gracefully
    if (
      error?.message?.includes('max requests limit') ||
      error?.message?.includes('rate limit')
    ) {
      console.warn('Upstash rate limit reached, skipping IMDB ID cache lookup');
    } else {
      console.error('Error fetching IMDB ID from cache:', error);
    }
    return null;
  }
}

export async function getCachedImdbIds(
  mediaType: 'movie' | 'tv',
  tmdbIds: number[]
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  if (!isKvEnabled()) {
    return results;
  }

  if (!isKvEnabled()) {
    return results;
  }

  const uniqueIds = Array.from(new Set(tmdbIds)).filter(
    (id) => typeof id === 'number'
  );
  const missingIds: number[] = [];

  uniqueIds.forEach((tmdbId) => {
    const memoryKey = cacheKey(`imdb:map:${mediaType}`, tmdbId);
    const cached = getMemoryCache<ImdbIdCacheValue | null>(memoryKey);
    if (cached) {
      results.set(tmdbId, cached.imdbId);
    } else {
      missingIds.push(tmdbId);
    }
  });

  if (missingIds.length === 0) {
    return results;
  }

  try {
    const client = getImdbKvClient();
    const keys = missingIds.map((id) => `imdb:map:${mediaType}:${id}`);
    const values = await client.mget(...keys);

    values.forEach((value, index) => {
      const tmdbId = missingIds[index];
      const typed = value as ImdbIdCacheValue | null;
      if (typed?.imdbId) {
        results.set(tmdbId, typed.imdbId);
        setMemoryCache(cacheKey(`imdb:map:${mediaType}`, tmdbId), typed);
      }
    });
  } catch (error: any) {
    // Handle Upstash rate limit or other errors gracefully
    if (
      error?.message?.includes('max requests limit') ||
      error?.message?.includes('rate limit')
    ) {
      console.warn('Upstash rate limit reached, skipping IMDB ID cache lookup');
    } else {
      console.error('Error fetching IMDB IDs from cache:', error);
    }
    // Return whatever we got from memory cache
  }

  return results;
}

export async function setCachedImdbId(
  mediaType: 'movie' | 'tv',
  tmdbId: number,
  imdbId: string
): Promise<void> {
  if (!isKvEnabled()) {
    return;
  }

  const value: ImdbIdCacheValue = { imdbId, updatedAt: Date.now() };
  setMemoryCache(cacheKey(`imdb:map:${mediaType}`, tmdbId), value);

  try {
    const client = getImdbKvClient();
    await client.set(`imdb:map:${mediaType}:${tmdbId}`, value);
  } catch (error: any) {
    // Handle Upstash rate limit or other errors gracefully
    if (
      error?.message?.includes('max requests limit') ||
      error?.message?.includes('rate limit')
    ) {
      console.warn('Upstash rate limit reached, skipping IMDB ID cache write');
    } else {
      console.error('Error setting IMDB ID cache:', error);
    }
    // Continue - memory cache is already updated
  }
}

export async function setCachedImdbIds(
  mediaType: 'movie' | 'tv',
  mappings: Map<number, string>
): Promise<void> {
  if (!isKvEnabled() || mappings.size === 0) {
    return;
  }

  const client = getImdbKvClient();
  const args: Array<string | ImdbIdCacheValue> = [];
  const now = Date.now();

  mappings.forEach((imdbId, tmdbId) => {
    const value: ImdbIdCacheValue = { imdbId, updatedAt: now };
    args.push(`imdb:map:${mediaType}:${tmdbId}`, value);
    setMemoryCache(cacheKey(`imdb:map:${mediaType}`, tmdbId), value);
  });

  try {
    // @ts-expect-error - mset accepts variadic args but TypeScript requires tuple type
    await client.mset(...args);
  } catch (error: any) {
    // Handle Upstash rate limit or other errors gracefully
    if (
      error?.message?.includes('max requests limit') ||
      error?.message?.includes('rate limit')
    ) {
      console.warn('Upstash rate limit reached, skipping IMDB IDs cache write');
    } else {
      console.error('Error setting IMDB IDs cache:', error);
    }
    // Continue - memory cache is already updated
  }
}

export async function getImdbRatingWithCache(
  imdbId: string,
  fetchRating: (id: string) => Promise<number | null>
): Promise<number | null> {
  const cached = await getCachedImdbRating(imdbId);
  if (cached !== null) {
    return cached;
  }

  const rating = await fetchRating(imdbId);
  if (rating !== null) {
    await setCachedImdbRating(imdbId, rating);
  }
  return rating;
}

export async function getCronState(): Promise<{
  dayIndex: number;
  lastRunDate: string | null;
  moviePage?: number;
  tvPage?: number;
} | null> {
  if (!isKvEnabled()) {
    return null;
  }
  const client = getImdbKvClient();
  return client.get('imdb:cron:state');
}

export async function acquireCronLock(dateKey: string): Promise<boolean> {
  if (!isKvEnabled()) {
    return false;
  }

  const client = getImdbKvClient();
  const result = await client.set(`imdb:cron:lock:${dateKey}`, '1', {
    nx: true,
    ex: 60 * 60,
  });

  return result === 'OK';
}

export async function setCronState(state: {
  dayIndex: number;
  lastRunDate: string;
  moviePage?: number;
  tvPage?: number;
}): Promise<void> {
  if (!isKvEnabled()) {
    return;
  }
  const client = getImdbKvClient();
  await client.set('imdb:cron:state', state);
}

export function isImdbCacheEnabled(): boolean {
  return isKvEnabled();
}

export async function incrementOmdbUsage(date: string): Promise<number> {
  const client = getImdbKvClient();
  return client.incr(`imdb:omdb:usage:${date}`);
}

export async function getOmdbUsage(date: string): Promise<number | null> {
  if (!isKvEnabled()) {
    return null;
  }
  const client = getImdbKvClient();
  const value = await client.get<number>(`imdb:omdb:usage:${date}`);
  return value ?? null;
}
