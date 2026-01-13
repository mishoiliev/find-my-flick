import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedImdbId,
  getCachedImdbRating,
  getImdbRatingWithCache,
  getCronState,
  isImdbCacheEnabled,
  incrementOmdbUsage,
  setCachedImdbId,
  setCronState,
} from '@/lib/imdb-cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const OMDB_API_KEY = process.env.OMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

const DAYS_IN_CYCLE = 30;
const REQUEST_CONCURRENCY = 5;
const MAX_TMDB_PAGES = 500;
const TARGET_NEW_RATINGS = 1000;

type PopularTitle = {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
};

function isAuthorizedCron(request: NextRequest): boolean {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (isVercelCron) {
    return true;
  }

  return process.env.NODE_ENV !== 'production';
}

async function fetchPopularPage(
  mediaType: 'movie' | 'tv',
  page: number
): Promise<PopularTitle[]> {
  const response = await fetch(
    `${TMDB_BASE_URL}/${mediaType}/popular?api_key=${TMDB_API_KEY}&page=${page}`
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  if (!data?.results) {
    return [];
  }

  return data.results.map((item: any) => ({
    id: item.id,
    media_type: mediaType,
    title: item.title,
    name: item.name,
  }));
}

async function fetchOmdbRating(imdbId: string): Promise<number | null> {
  if (!OMDB_API_KEY) {
    return null;
  }

  try {
    const dateKey = new Date().toISOString().slice(0, 10);
    await incrementOmdbUsage(dateKey);
    const response = await fetch(
      `${OMDB_BASE_URL}/?i=${imdbId}&apikey=${OMDB_API_KEY}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.Response === 'True' && data.imdbRating) {
      const rating = parseFloat(data.imdbRating);
      return Number.isNaN(rating) ? null : rating;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getImdbIdForTitle(
  title: PopularTitle
): Promise<string | null> {
  const cached = await getCachedImdbId(title.media_type, title.id);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/${title.media_type}/${title.id}/external_ids?api_key=${TMDB_API_KEY}`,
    {
      next: { revalidate: 3600 },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const imdbId = data.imdb_id;
  if (imdbId) {
    await setCachedImdbId(title.media_type, title.id, imdbId);
  }
  return imdbId || null;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TMDB_API_KEY || !OMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY and OMDB_API_KEY are required' },
      { status: 500 }
    );
  }

  if (!isImdbCacheEnabled()) {
    return NextResponse.json(
      { error: 'KV is not configured for IMDb cache' },
      { status: 500 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const state = await getCronState();
  if (state?.lastRunDate === today) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'Already ran today',
      dayIndex: state.dayIndex,
    });
  }

  const nextDayIndex = ((state?.dayIndex ?? -1) + 1) % DAYS_IN_CYCLE;
  let moviePage = state?.moviePage ?? 1;
  let tvPage = state?.tvPage ?? 1;

  if (nextDayIndex === 0) {
    moviePage = 1;
    tvPage = 1;
  }

  let processed = 0;
  let cachedRatings = 0;
  let fetchedRatings = 0;
  let missingRatings = 0;
  let missingImdbId = 0;
  let newRatings = 0;
  let moviePagesScanned = 0;
  let tvPagesScanned = 0;

  while (
    newRatings < TARGET_NEW_RATINGS &&
    (moviePage <= MAX_TMDB_PAGES || tvPage <= MAX_TMDB_PAGES)
  ) {
    const [movieResults, tvResults] = await Promise.all([
      moviePage <= MAX_TMDB_PAGES
        ? fetchPopularPage('movie', moviePage)
        : Promise.resolve([]),
      tvPage <= MAX_TMDB_PAGES
        ? fetchPopularPage('tv', tvPage)
        : Promise.resolve([]),
    ]);

    if (movieResults.length > 0) {
      moviePagesScanned += 1;
      moviePage += 1;
    }
    if (tvResults.length > 0) {
      tvPagesScanned += 1;
      tvPage += 1;
    }

    const titles = [...movieResults, ...tvResults];
    if (titles.length === 0) {
      break;
    }

    for (let i = 0; i < titles.length; i += REQUEST_CONCURRENCY) {
      if (newRatings >= TARGET_NEW_RATINGS) {
        break;
      }

      const chunk = titles.slice(i, i + REQUEST_CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (title) => {
          const imdbId = await getImdbIdForTitle(title);
          if (!imdbId) {
            missingImdbId += 1;
            return;
          }

          const cached = await getCachedImdbRating(imdbId);
          if (cached !== null) {
            cachedRatings += 1;
            return;
          }

          const rating = await getImdbRatingWithCache(imdbId, fetchOmdbRating);
          if (rating !== null) {
            fetchedRatings += 1;
            newRatings += 1;
          } else {
            missingRatings += 1;
          }
        })
      );

      processed += results.length;
    }
  }

  await setCronState({
    dayIndex: nextDayIndex,
    lastRunDate: today,
    moviePage,
    tvPage,
  });

  return NextResponse.json({
    status: 'ok',
    dayIndex: nextDayIndex,
    moviePage,
    tvPage,
    moviePagesScanned,
    tvPagesScanned,
    processed,
    cachedRatings,
    fetchedRatings,
    missingRatings,
    missingImdbId,
    newRatings,
    targetNewRatings: TARGET_NEW_RATINGS,
  });
}
