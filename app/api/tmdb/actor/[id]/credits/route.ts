import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedImdbIds,
  getCachedImdbRatings,
  setCachedImdbIds,
} from '@/lib/imdb-cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
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

    // Enrich with IMDB ratings if requested
    if (enriched) {
      const batchSize = 5;
      const enrichedShows: any[] = [];

      for (let i = 0; i < uniqueShows.length; i += batchSize) {
        const batch = uniqueShows.slice(i, i + batchSize);
        const typeGroups = new Map<'movie' | 'tv', number[]>();
        batch.forEach((show) => {
          const mediaType = (show.media_type || 'movie') as 'movie' | 'tv';
          if (!typeGroups.has(mediaType)) {
            typeGroups.set(mediaType, []);
          }
          typeGroups.get(mediaType)!.push(show.id);
        });

        const cachedMappingsByType = new Map<'movie' | 'tv', Map<number, string>>();
        await Promise.all(
          Array.from(typeGroups.entries()).map(async ([mediaType, ids]) => {
            const mappings = await getCachedImdbIds(mediaType, ids);
            cachedMappingsByType.set(mediaType, mappings);
          })
        );

        const newMappingsByType = new Map<'movie' | 'tv', Map<number, string>>();

        const resolved = await Promise.all(
          batch.map(async (show) => {
            const mediaType = (show.media_type || 'movie') as 'movie' | 'tv';
            if (show.imdb_rating !== undefined) {
              return { show, imdbId: show.imdb_id || null };
            }

            const cachedMappings =
              cachedMappingsByType.get(mediaType) || new Map();
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
                  if (!newMappingsByType.has(mediaType)) {
                    newMappingsByType.set(mediaType, new Map());
                  }
                  newMappingsByType.get(mediaType)!.set(show.id, imdbId);
                }
              }
            }

            return { show, imdbId };
          })
        );

        await Promise.all(
          Array.from(newMappingsByType.entries()).map(([mediaType, mappings]) =>
            mappings.size > 0 ? setCachedImdbIds(mediaType, mappings) : null
          )
        );

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

        // Small delay between batches
        if (i + batchSize < uniqueShows.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      return NextResponse.json({ credits: enrichedShows });
    }

    return NextResponse.json({ credits: uniqueShows });
  } catch (error) {
    console.error('Error fetching actor credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actor credits' },
      { status: 500 }
    );
  }
}
