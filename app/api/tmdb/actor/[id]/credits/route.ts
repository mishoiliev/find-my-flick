import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const enriched = searchParams.get('enriched') === 'true';

  try {
    const [movieCreditsRes, tvCreditsRes] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/person/${id}/movie_credits?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 },
        }
      ),
      fetch(
        `${TMDB_BASE_URL}/person/${id}/tv_credits?api_key=${TMDB_API_KEY}`,
        {
          next: { revalidate: 3600 },
        }
      ),
    ]);

    if (!movieCreditsRes.ok || !tvCreditsRes.ok) {
      throw new Error('Failed to fetch actor credits');
    }

    const movieCredits = await movieCreditsRes.json();
    const tvCredits = await tvCreditsRes.json();

    // Normalize movie credits
    const movieShows = (movieCredits.cast || []).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      name: movie.title,
      overview: movie.overview || '',
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      release_date: movie.release_date,
      vote_average: movie.vote_average || 0,
      vote_count: movie.vote_count,
      popularity: movie.popularity,
      revenue: movie.revenue || 0,
      order: movie.order ?? 999,
      episode_count: 0,
      media_type: 'movie' as const,
    }));

    // Normalize TV credits
    const tvShows = (tvCredits.cast || []).map((show: any) => ({
      id: show.id,
      title: show.name,
      name: show.name,
      overview: show.overview || '',
      poster_path: show.poster_path,
      backdrop_path: show.backdrop_path,
      first_air_date: show.first_air_date,
      vote_average: show.vote_average || 0,
      vote_count: show.vote_count,
      popularity: show.popularity,
      revenue: 0,
      order: show.order ?? 999,
      episode_count: show.episode_count || 0,
      media_type: 'tv' as const,
    }));

    // Combine and remove duplicates
    const allShows = [...movieShows, ...tvShows];
    const uniqueShows = allShows.filter(
      (show, index, self) =>
        index ===
        self.findIndex(
          (s) => s.id === show.id && s.media_type === show.media_type
        )
    );

    return NextResponse.json({ credits: uniqueShows });
  } catch (error) {
    console.error('Error fetching actor credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actor credits' },
      { status: 500 }
    );
  }
}
