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

function isKvEnabled(): boolean {
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

  const client = getImdbKvClient();
  const value = await client.get<ImdbRatingCacheValue>(`imdb:rating:${imdbId}`);
  return value?.rating ?? null;
}

export async function setCachedImdbRating(
  imdbId: string,
  rating: number
): Promise<void> {
  if (!isKvEnabled()) {
    return;
  }

  const value: ImdbRatingCacheValue = { rating, updatedAt: Date.now() };
  const client = getImdbKvClient();
  await client.set(`imdb:rating:${imdbId}`, value);
}

export async function getCachedImdbId(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<string | null> {
  if (!isKvEnabled()) {
    return null;
  }

  const client = getImdbKvClient();
  const value = await client.get<ImdbIdCacheValue>(
    `imdb:map:${mediaType}:${tmdbId}`
  );
  return value?.imdbId ?? null;
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
  const client = getImdbKvClient();
  await client.set(`imdb:map:${mediaType}:${tmdbId}`, value);
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
  const client = getImdbKvClient();
  const value = await client.get<number>(`imdb:omdb:usage:${date}`);
  return value ?? null;
}
