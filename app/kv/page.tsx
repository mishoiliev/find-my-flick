import {
  getImdbKvClient,
  getOmdbUsage,
  isImdbCacheEnabled,
} from '@/lib/imdb-cache';
import { notFound } from 'next/navigation';

type ImdbRatingValue = {
  rating: number;
  updatedAt: number;
};

type ImdbIdValue = {
  imdbId: string;
  updatedAt: number;
};

const MAX_KEYS = 50;

async function collectKeys(pattern: string, limit: number): Promise<string[]> {
  const client = getImdbKvClient();
  const keys: string[] = [];

  for await (const key of client.scanIterator({ match: pattern, count: 100 })) {
    keys.push(key);
    if (keys.length >= limit) {
      break;
    }
  }

  return keys;
}

export const dynamic = 'force-dynamic';

export default async function KvPage() {
  if (process.env.NODE_ENV === 'production') {
    return notFound();
  }

  if (!isImdbCacheEnabled()) {
    return (
      <div className='min-h-screen bg-[#0f0f0f] text-[#f2f2f1] p-8'>
        <div className='max-w-4xl mx-auto'>
          <h1 className='text-3xl font-bold text-[#FFD700] mb-4'>KV Cache</h1>
          <p className='text-[#f2f2f1]/80'>
            KV is not configured. Set IMDB_RATINGS_KV_REST_API_URL and
            IMDB_RATINGS_KV_REST_API_TOKEN.
          </p>
        </div>
      </div>
    );
  }

  const client = getImdbKvClient();
  const todayKey = new Date().toISOString().slice(0, 10);
  const nextReset = new Date();
  nextReset.setUTCHours(24, 0, 0, 0);

  const [ratingKeys, mapKeys, cronState] = await Promise.all([
    collectKeys('imdb:rating:*', MAX_KEYS),
    collectKeys('imdb:map:*', MAX_KEYS),
    client.get('imdb:cron:state'),
  ]);

  const [ratingValues, mapValues, omdbUsage] = await Promise.all([
    ratingKeys.length ? client.mget(...ratingKeys) : [],
    mapKeys.length ? client.mget(...mapKeys) : [],
    getOmdbUsage(todayKey),
  ]);

  const ratings = ratingKeys.map((key, index) => ({
    key,
    value: ratingValues[index] as ImdbRatingValue | null,
  }));
  const mappings = mapKeys.map((key, index) => ({
    key,
    value: mapValues[index] as ImdbIdValue | null,
  }));

  return (
    <div className='min-h-screen bg-[#0f0f0f] text-[#f2f2f1] p-8'>
      <div className='max-w-5xl mx-auto space-y-8'>
        <div>
          <h1 className='text-3xl font-bold text-[#FFD700] mb-2'>KV Cache</h1>
          <p className='text-[#f2f2f1]/70'>
            Showing up to {MAX_KEYS} entries per section.
          </p>
        </div>

        <div className='bg-[#151515] border border-[#FFD700]/15 rounded-lg p-6'>
          <h2 className='text-xl font-semibold text-[#FFD700] mb-3'>
            Cron State
          </h2>
          <pre className='text-sm text-[#f2f2f1]/80 whitespace-pre-wrap'>
            {JSON.stringify(cronState, null, 2)}
          </pre>
        </div>

        <div className='bg-[#151515] border border-[#FFD700]/15 rounded-lg p-6'>
          <h2 className='text-xl font-semibold text-[#FFD700] mb-3'>
            OMDb Usage
          </h2>
          <p className='text-sm text-[#f2f2f1]/80'>
            Requests today (UTC {todayKey}): {omdbUsage ?? 0}
          </p>
          <p className='text-sm text-[#f2f2f1]/60 mt-2'>
            Next reset (UTC): {nextReset.toLocaleString()}
          </p>
        </div>

        <div className='bg-[#151515] border border-[#FFD700]/15 rounded-lg p-6'>
          <h2 className='text-xl font-semibold text-[#FFD700] mb-3'>
            IMDb Ratings
          </h2>
          {ratings.length === 0 ? (
            <p className='text-[#f2f2f1]/70'>No rating keys found.</p>
          ) : (
            <div className='space-y-3'>
              {ratings.map((entry) => (
                <div
                  key={entry.key}
                  className='border border-[#FFD700]/10 rounded-md p-3 text-sm'
                >
                  <div className='text-[#FFD700]'>{entry.key}</div>
                  <div className='text-[#f2f2f1]/80'>
                    {entry.value
                      ? `rating: ${entry.value.rating}, updatedAt: ${new Date(
                          entry.value.updatedAt
                        ).toLocaleString()}`
                      : 'missing'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='bg-[#151515] border border-[#FFD700]/15 rounded-lg p-6'>
          <h2 className='text-xl font-semibold text-[#FFD700] mb-3'>
            TMDB → IMDb Map
          </h2>
          {mappings.length === 0 ? (
            <p className='text-[#f2f2f1]/70'>No mapping keys found.</p>
          ) : (
            <div className='space-y-3'>
              {mappings.map((entry) => (
                <div
                  key={entry.key}
                  className='border border-[#FFD700]/10 rounded-md p-3 text-sm'
                >
                  <div className='text-[#FFD700]'>{entry.key}</div>
                  <div className='text-[#f2f2f1]/80'>
                    {entry.value
                      ? `imdbId: ${entry.value.imdbId}, updatedAt: ${new Date(
                          entry.value.updatedAt
                        ).toLocaleString()}`
                      : 'missing'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
