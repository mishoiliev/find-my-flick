import Image from 'next/image';
import {
  getShowDetails,
  getPosterUrl,
  getBackdropUrl,
  getShowTitle,
  getShowDate,
  getWatchProviders,
  getShowCredits,
} from '@/lib/tmdb';
import { notFound } from 'next/navigation';
import WatchProviders from '@/components/WatchProviders';
import HypeMeter from '@/components/HypeMeter';
import CastList from '@/components/CastList';

interface ShowDetailPageProps {
  params: {
    type: string;
    id: string;
  };
}

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { type, id } = params;
  const showId = parseInt(id);
  const mediaType = type === 'tv' ? 'tv' : 'movie';

  if (isNaN(showId)) {
    notFound();
  }

  const [show, watchProviders, cast] = await Promise.all([
    getShowDetails(showId, mediaType),
    getWatchProviders(showId, mediaType, 'US'), // Default to US, can be made dynamic
    getShowCredits(showId, mediaType),
  ]);

  if (!show) {
    notFound();
  }

  const title = getShowTitle(show);
  const date = getShowDate(show);
  const posterUrl = getPosterUrl(show.poster_path);
  const backdropUrl = getBackdropUrl(show.backdrop_path);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]">
      {/* Backdrop */}
      {show.backdrop_path && (
        <div className="relative h-[60vh] w-full overflow-hidden">
          <Image
            src={backdropUrl}
            alt={title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 -mt-32 relative z-10">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="w-48 md:w-64 aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl">
              {show.poster_path ? (
                <Image
                  src={posterUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 192px, 256px"
                />
              ) : (
                <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                  <span className="text-[#FFD700]/50">No Image</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-[#FFD700]">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold">{title}</h1>
              <span className="px-3 py-1 bg-[#FFD700] text-[#000000] rounded-full text-sm font-semibold">
                {mediaType === 'tv' ? 'TV Show' : 'Movie'}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6 text-[#f2f2f1] flex-wrap">
              <span>{date}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="text-[#FFD700]">⭐</span>
                <span>{show.vote_average.toFixed(1)}</span>
              </div>
              {show.popularity !== undefined && (
                <>
                  <span>•</span>
                  <HypeMeter popularity={show.popularity} />
                </>
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-[#FFD700]">Overview</h2>
              <p className="text-[#f2f2f1] text-lg leading-relaxed">
                {show.overview || 'No overview available.'}
              </p>
            </div>

            {/* Watch Providers */}
            <div className="mt-8">
              <WatchProviders providers={watchProviders} countryCode="US" />
            </div>
          </div>
        </div>

        {/* Cast List */}
        {cast && cast.length > 0 && (
          <div className="mt-8">
            <CastList cast={cast} />
          </div>
        )}
      </div>
    </div>
  );
}
