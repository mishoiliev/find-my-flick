import { discoverShowsByGenreLogic } from '@/lib/discover';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const genreIds = searchParams.get('genres'); // Comma-separated genre IDs
  const typeParam = searchParams.get('type') || 'all'; // 'all', 'movie', 'tv'
  const type: 'all' | 'movie' | 'tv' =
    typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all';
  const page = searchParams.get('page') || '1';
  const maxResults = parseInt(searchParams.get('maxResults') || '50', 10);

  if (!genreIds) {
    return NextResponse.json(
      { error: 'Genre IDs parameter is required' },
      { status: 400 }
    );
  }

  const genreIdArray = genreIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (genreIdArray.length === 0) {
    return NextResponse.json(
      { error: 'At least one genre ID is required' },
      { status: 400 }
    );
  }

  try {
    const result = await discoverShowsByGenreLogic(
      genreIdArray,
      type,
      page,
      maxResults
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error discovering shows by genre:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to discover shows by genre',
        details: errorMessage,
        results: [],
        page: 1,
        total_pages: 0,
        total_results: 0,
      },
      { status: 500 }
    );
  }
}
