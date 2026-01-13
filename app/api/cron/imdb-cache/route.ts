import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedImdbId,
  getCachedImdbRating,
  getImdbRatingWithCache,
  getCronState,
  isImdbCacheEnabled,
  setCachedImdbId,
  setCronState,
} from '@/lib/imdb-cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const OMDB_API_KEY = process.env.OMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

const MOVIE_PAGES_PER_DAY = 25; // 25 pages * 20 = 500 movies
const TV_PAGES_PER_DAY = 25; // 25 pages * 20 = 500 TV shows
const DAYS_IN_CYCLE = 30;
const REQUEST_CONCURRENCY = 5;

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

async function fetchPopularPages(
  mediaType: 'movie' | 'tv',
  pageStart: number,
  pageEnd: number
): Promise<PopularTitle[]> {
  const pages = Array.from(
    { length: pageEnd - pageStart + 1 },
    (_, index) => pageStart + index
  );
  const results: PopularTitle[] = [];

  for (let i = 0; i < pages.length; i += REQUEST_CONCURRENCY) {
    const chunk = pages.slice(i, i + REQUEST_CONCURRENCY);
    const responses = await Promise.all(
      chunk.map((page) =>
        fetch(`${TMDB_BASE_URL}/${mediaType}/popular?api_key=${TMDB_API_KEY}&page=${page}`)
      )
    );

    const data = await Promise.all(
      responses.map(async (res) => (res.ok ? res.json() : null))
    );

    data.forEach((payload) => {
      if (!payload?.results) {
        return;
      }
      payload.results.forEach((item: any) => {
        results.push({
          id: item.id,
          media_type: mediaType,
          title: item.title,
          name: item.name,
        });
      });
    });
  }

  return results;
}

async function fetchOmdbRating(imdbId: string): Promise<number | null> {
  if (!OMDB_API_KEY) {
    return null;
  }

  try {
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
  const moviePageStart = nextDayIndex * MOVIE_PAGES_PER_DAY + 1;
  const moviePageEnd = moviePageStart + MOVIE_PAGES_PER_DAY - 1;
  const tvPageStart = nextDayIndex * TV_PAGES_PER_DAY + 1;
  const tvPageEnd = tvPageStart + TV_PAGES_PER_DAY - 1;

  const [movieResults, tvResults] = await Promise.all([
    fetchPopularPages('movie', moviePageStart, moviePageEnd),
    fetchPopularPages('tv', tvPageStart, tvPageEnd),
  ]);

  const titles = [...movieResults, ...tvResults];

  let processed = 0;
  let cachedRatings = 0;
  let fetchedRatings = 0;
  let missingRatings = 0;
  let missingImdbId = 0;

  for (let i = 0; i < titles.length; i += REQUEST_CONCURRENCY) {
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
        } else {
          missingRatings += 1;
        }
      })
    );

    processed += results.length;
  }

  await setCronState({ dayIndex: nextDayIndex, lastRunDate: today });

  return NextResponse.json({
    status: 'ok',
    dayIndex: nextDayIndex,
    moviePages: { start: moviePageStart, end: moviePageEnd },
    tvPages: { start: tvPageStart, end: tvPageEnd },
    titlesFetched: titles.length,
    processed,
    cachedRatings,
    fetchedRatings,
    missingRatings,
    missingImdbId,
  });
}
