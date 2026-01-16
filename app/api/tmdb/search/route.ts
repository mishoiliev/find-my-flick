import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Cache for 10 minutes (search results can be cached briefly)
export const revalidate = 600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const page = searchParams.get('page') || '1';
  const maxResults = searchParams.get('maxResults') || '30';

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          query
        )}&page=${page}`,
        {
          next: { revalidate: 600 },
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

    const movieData = await movieResponse.json();
    const tvData = await tvResponse.json();

    // Combine and normalize results
    const combinedResults = [
      ...movieData.results.map((m: any) => ({
        ...m,
        media_type: 'movie',
        title: m.title || m.name,
        name: m.name || m.title,
      })),
      ...tvData.results.map((t: any) => ({
        ...t,
        media_type: 'tv',
        title: t.name || t.title,
        name: t.name || t.title,
      })),
    ];

    // Calculate pagination
    const combinedTotal = movieData.total_results + tvData.total_results;
    const resultsPerPage = 40;
    const calculatedTotalPages = Math.ceil(combinedTotal / resultsPerPage);
    const maxTotalPages = Math.max(movieData.total_pages, tvData.total_pages);

    const finalResults = combinedResults.slice(0, parseInt(maxResults));

    // Ensure we always return results array, even if empty
    return NextResponse.json(
      {
        results: finalResults || [],
        page: parseInt(page),
        total_pages: Math.max(calculatedTotalPages, maxTotalPages),
        total_results: combinedTotal,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
        },
      }
    );
  } catch (error) {
    console.error('Error searching shows:', error);
    return NextResponse.json(
      {
        error: 'Failed to search shows',
        results: [],
        page: 1,
        total_pages: 0,
        total_results: 0,
      },
      { status: 500 }
    );
  }
}
