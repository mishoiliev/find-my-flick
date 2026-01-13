import { createClient, kv } from '@vercel/kv';

type ImdbRatingCacheValue = {
  rating: number;
  updatedAt: number;
};

type ImdbIdCacheValue = {
  imdbId: string;
  updatedAt: number;
};

function getKvClient() {
  if (
    process.env.IMDB_RATINGS_KV_REST_API_URL &&
    process.env.IMDB_RATINGS_KV_REST_API_TOKEN
  ) {
    return createClient({
      url: process.env.IMDB_RATINGS_KV_REST_API_URL,
      token: process.env.IMDB_RATINGS_KV_REST_API_TOKEN,
    });
  }

  return kv;
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

  const client = getKvClient();
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
  const client = getKvClient();
  await client.set(`imdb:rating:${imdbId}`, value);
}

export async function getCachedImdbId(
  mediaType: 'movie' | 'tv',
  tmdbId: number
): Promise<string | null> {
  if (!isKvEnabled()) {
    return null;
  }

  const client = getKvClient();
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
  const client = getKvClient();
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
} | null> {
  if (!isKvEnabled()) {
    return null;
  }
  const client = getKvClient();
  return client.get('imdb:cron:state');
}

export async function setCronState(state: {
  dayIndex: number;
  lastRunDate: string;
}): Promise<void> {
  if (!isKvEnabled()) {
    return;
  }
  const client = getKvClient();
  await client.set('imdb:cron:state', state);
}

export function isImdbCacheEnabled(): boolean {
  return isKvEnabled();
}
