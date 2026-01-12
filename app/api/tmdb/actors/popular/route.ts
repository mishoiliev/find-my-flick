import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request: NextRequest) {
  try {
    // Fetch multiple pages to get 250 actors (20 per page, need 13 pages)
    const pagesToFetch = 13;
    const requests = Array.from({ length: pagesToFetch }, (_, i) =>
      fetch(
        `${TMDB_BASE_URL}/person/popular?api_key=${TMDB_API_KEY}&page=${i + 1}`,
        {
          next: { revalidate: 86400 },
        }
      )
    );

    const responses = await Promise.all(requests);
    const dataPromises = responses.map((res) => res.json());
    const allData = await Promise.all(dataPromises);

    // Combine all actors and sort by popularity
    const allActors = allData.flatMap((page: any) => page.results);
    const sortedActors = allActors
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 250);

    return NextResponse.json({ results: sortedActors });
  } catch (error) {
    console.error('Error fetching popular actors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular actors' },
      { status: 500 }
    );
  }
}
