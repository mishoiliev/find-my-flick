import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedImdbIds,
  getCachedImdbRatings,
  setCachedImdbIds,
} from '@/lib/imdb-cache';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shows } = body;

    if (!Array.isArray(shows)) {
      return NextResponse.json(
        { error: 'Shows must be an array' },
        { status: 400 }
      );
    }

    // Process in batches to avoid rate limiting
    const batchSize = 5;
    const enrichedShows: any[] = [];

    for (let i = 0; i < shows.length; i += batchSize) {
      const batch = shows.slice(i, i + batchSize);
      const typeGroups = new Map<'movie' | 'tv', number[]>();
      batch.forEach((show: any) => {
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
        batch.map(async (show: any) => {
          const resolvedMediaType = show.media_type || 'movie';
          if (show.imdb_rating !== undefined) {
            return { show, imdbId: show.imdb_id || null };
          }

          const cachedMappings =
            cachedMappingsByType.get(resolvedMediaType) || new Map();
          let imdbId = cachedMappings.get(show.id) || null;

          if (!imdbId) {
            const externalIdsResponse = await fetch(
              `${TMDB_BASE_URL}/${resolvedMediaType}/${show.id}/external_ids?api_key=${TMDB_API_KEY}`,
              {
                next: { revalidate: 3600 },
              }
            );

            if (externalIdsResponse.ok) {
              const externalIds = await externalIdsResponse.json();
              imdbId = externalIds.imdb_id || null;
              if (imdbId) {
                if (!newMappingsByType.has(resolvedMediaType)) {
                  newMappingsByType.set(resolvedMediaType, new Map());
                }
                newMappingsByType.get(resolvedMediaType)!.set(show.id, imdbId);
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
      if (i + batchSize < shows.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({ shows: enrichedShows });
  } catch (error) {
    console.error('Error enriching shows:', error);
    return NextResponse.json(
      { error: 'Failed to enrich shows' },
      { status: 500 }
    );
  }
}
