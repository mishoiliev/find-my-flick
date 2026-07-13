import {
  CACHE_TTL,
  noStoreHeaders,
  publicCacheHeaders,
} from '@/lib/http-cache';
import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const typeParam = searchParams.get('type');
  const type =
    typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all';
  const limit = Math.max(
    1,
    Math.min(50, parseInt(searchParams.get('limit') || '20', 10) || 20)
  );

  try {
    let results: any[] = [];

    if (type === 'all') {
      // Fetch multiple pages if needed to get enough results
      const pagesNeeded = Math.ceil(limit / 20);
      const fetchPromises: Promise<any>[] = [];

      for (let page = 1; page <= pagesNeeded; page++) {
        fetchPromises.push(
          fetch(
            `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`,
            {
              next: { revalidate: CACHE_TTL.catalog },
            }
          ),
          fetch(
            `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`,
            {
              next: { revalidate: CACHE_TTL.catalog },
            }
          )
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
          fetch(
            `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`,
            {
              next: { revalidate: CACHE_TTL.catalog },
            }
          )
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
    } else if (type === 'tv') {
      const pagesNeeded = Math.ceil(limit / 20);
      const fetchPromises: Promise<Response>[] = [];

      for (let page = 1; page <= pagesNeeded; page++) {
        fetchPromises.push(
          fetch(
            `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`,
            {
              next: { revalidate: CACHE_TTL.catalog },
            }
          )
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
    }

    // Ensure we always return results array, even if empty
    return NextResponse.json(
      { results: results || [] },
      {
        headers: publicCacheHeaders(CACHE_TTL.catalog),
      }
    );
  } catch (error) {
    console.error('Error fetching popular shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular shows' },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
