import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedImdbIds,
  getCachedImdbRatings,
  setCachedImdbIds,
} from '@/lib/imdb-cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Enrich show with IMDB rating
// Enrich multiple shows with IMDB ratings
async function enrichShowsWithIMDBRatings(
  shows: any[],
  mediaType: 'movie' | 'tv'
): Promise<any[]> {
  const showsToEnrich = shows.slice(0, 20);
  const remainingShows = shows.slice(20);

  const batchSize = 5;
  const enrichedShows: any[] = [];

  for (let i = 0; i < showsToEnrich.length; i += batchSize) {
    const batch = showsToEnrich.slice(i, i + batchSize);
    const tmdbIds = batch.map((show) => show.id);
    const cachedMappings = await getCachedImdbIds(mediaType, tmdbIds);
    const newMappings = new Map<number, string>();

    const resolved = await Promise.all(
      batch.map(async (show) => {
        if (show.imdb_rating !== undefined) {
          return { show, imdbId: show.imdb_id || null };
        }

        let imdbId = cachedMappings.get(show.id) || null;

        if (!imdbId) {
          const externalIdsResponse = await fetch(
            `${TMDB_BASE_URL}/${mediaType}/${show.id}/external_ids?api_key=${TMDB_API_KEY}`,
            {
              next: { revalidate: 3600 },
            }
          );

          if (externalIdsResponse.ok) {
            const externalIds = await externalIdsResponse.json();
            imdbId = externalIds.imdb_id || null;
            if (imdbId) {
              newMappings.set(show.id, imdbId);
            }
          }
        }

        return { show, imdbId };
      })
    );

    if (newMappings.size > 0) {
      await setCachedImdbIds(mediaType, newMappings);
    }

    const imdbIds = resolved
      .filter((item) => item.imdbId && item.show.imdb_rating === undefined)
      .map((item) => item.imdbId as string);
    const ratings = imdbIds.length
      ? await getCachedImdbRatings(imdbIds)
      : new Map<string, number>();

    resolved.forEach(({ show, imdbId }) => {
      if (imdbId) {
        show.imdb_id = imdbId;
        if (show.imdb_rating === undefined) {
          const rating = ratings.get(imdbId);
          if (rating !== undefined) {
            show.imdb_rating = rating;
          }
        }
      }
      enrichedShows.push(show);
    });
  }

  return [...enrichedShows, ...remainingShows];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'all'; // 'all', 'movie', 'tv'
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    let results: any[] = [];

    if (type === 'all') {
      // Fetch multiple pages if needed to get enough results
      const pagesNeeded = Math.ceil(limit / 20);
      const fetchPromises: Promise<any>[] = [];
      
      for (let page = 1; page <= pagesNeeded; page++) {
        fetchPromises.push(
          fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`, {
            next: { revalidate: 1800 },
          }),
          fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`, {
            next: { revalidate: 1800 },
          })
        );
      }

      const responses = await Promise.all(fetchPromises);
      const allMovies: any[] = [];
      const allTVShows: any[] = [];

      // Process responses in pairs (movie, tv)
      for (let i = 0; i < responses.length; i += 2) {
        const moviesRes = responses[i];
        const tvRes = responses[i + 1];

        if (moviesRes && moviesRes.ok) {
          const moviesData = await moviesRes.json();
          allMovies.push(...(moviesData.results || []));
        }
        if (tvRes && tvRes.ok) {
          const tvData = await tvRes.json();
          allTVShows.push(...(tvData.results || []));
        }
      }

      const movies = allMovies.map((m: any) => ({
        ...m,
        media_type: 'movie',
        title: m.title || m.name,
        name: m.name || m.title,
      }));

      const tvShows = allTVShows.map((t: any) => ({
        ...t,
        media_type: 'tv',
        title: t.name || t.title,
        name: t.name || t.title,
      }));

      // Combine, remove duplicates, sort by popularity, and limit
      const combined = [...movies, ...tvShows];
      const seen = new Set<string>();
      const unique = combined.filter((show) => {
        const key = `${show.media_type}-${show.id}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      unique.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      results = unique.slice(0, limit);
    } else if (type === 'movie') {
      const pagesNeeded = Math.ceil(limit / 20);
      const fetchPromises: Promise<Response>[] = [];
      
      for (let page = 1; page <= pagesNeeded; page++) {
        fetchPromises.push(
          fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`, {
            next: { revalidate: 1800 },
          })
        );
      }

      const responses = await Promise.all(fetchPromises);
      const allResults: any[] = [];

      for (const res of responses) {
        if (res.ok) {
          const data = await res.json();
          allResults.push(...data.results);
        }
      }

      results = allResults
        .map((m: any) => ({
          ...m,
          media_type: 'movie',
          title: m.title || m.name,
          name: m.name || m.title,
        }))
        .slice(0, limit);

      // Enrich with IMDB ratings
      results = await enrichShowsWithIMDBRatings(results, 'movie');
    } else if (type === 'tv') {
      const pagesNeeded = Math.ceil(limit / 20);
      const fetchPromises: Promise<Response>[] = [];
      
      for (let page = 1; page <= pagesNeeded; page++) {
        fetchPromises.push(
          fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`, {
            next: { revalidate: 1800 },
          })
        );
      }

      const responses = await Promise.all(fetchPromises);
      const allResults: any[] = [];

      for (const res of responses) {
        if (res.ok) {
          const data = await res.json();
          allResults.push(...data.results);
        }
      }

      results = allResults
        .map((t: any) => ({
          ...t,
          media_type: 'tv',
          title: t.name || t.title,
          name: t.name || t.title,
        }))
        .slice(0, limit);

      // Enrich with IMDB ratings
      results = await enrichShowsWithIMDBRatings(results, 'tv');
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching popular shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular shows' },
      { status: 500 }
    );
  }
}
