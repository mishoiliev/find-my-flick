import CastList from '@/components/CastList';
import HypeMeter from '@/components/HypeMeter';
import JsonLd from '@/components/JsonLd';
import WatchProviders from '@/components/WatchProviders';
import { getSiteUrl } from '@/lib/site';
import {
  getBackdropUrl,
  getPosterUrl,
  getShowCredits,
  getShowDate,
  getShowDetails,
  getShowRating,
  getShowTitle,
} from '@/lib/tmdb';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

// Enable static generation with revalidation to reduce function invocations
export const revalidate = 3600; // Revalidate every hour

interface ShowDetailPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: ShowDetailPageProps): Promise<Metadata> {
  const { type, id } = await params;
  const showId = parseInt(id);
  const mediaType = type === 'tv' ? 'tv' : 'movie';

  if (isNaN(showId)) {
    return {
      title: 'Show Not Found',
    };
  }

  const show = await getShowDetails(showId, mediaType);

  if (!show) {
    return {
      title: 'Show Not Found',
    };
  }

  const title = getShowTitle(show);
  const description =
    show.overview ||
    `Find where to watch ${title}. Discover streaming platforms, rental options, and purchase locations.`;
  const posterUrl = getPosterUrl(show.poster_path);
  const backdropUrl = getBackdropUrl(show.backdrop_path);
  const siteUrl = getSiteUrl().toString();
  const canonicalUrl = `${siteUrl}/show/${type}/${id}`;

  const keywords = [
    title,
    mediaType === 'tv' ? 'TV show' : 'movie',
    'where to watch',
    'streaming',
    'watch online',
  ];

  // Add genres if available (TMDB API returns genres but they're not in our Show type)
  if ('genres' in show && Array.isArray((show as any).genres)) {
    keywords.push(...(show as any).genres.map((g: { name: string }) => g.name));
  }

  return {
    title: `${title} - Where to Watch`,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} - Where to Watch | Find my Flick`,
      description,
      type: mediaType === 'tv' ? 'video.tv_show' : 'video.movie',
      url: canonicalUrl,
      images: [
        {
          url: backdropUrl || posterUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
        {
          url: posterUrl,
          width: 500,
          height: 750,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Where to Watch`,
      description,
      images: [backdropUrl || posterUrl],
    },
  };
}

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { type, id } = await params;
  const showId = parseInt(id);
  const mediaType = type === 'tv' ? 'tv' : 'movie';

  if (isNaN(showId)) {
    notFound();
  }

  const [show, cast] = await Promise.all([
    getShowDetails(showId, mediaType),
    getShowCredits(showId, mediaType),
  ]);

  if (!show) {
    notFound();
  }

  const title = getShowTitle(show);
  const dateString = getShowDate(show);
  const posterUrl = getPosterUrl(show.poster_path);
  const backdropUrl = getBackdropUrl(show.backdrop_path);
  const siteUrl = getSiteUrl().toString();
  const canonicalUrl = `${siteUrl}/show/${type}/${id}`;
  const description =
    show.overview ||
    `Find where to watch ${title}. Discover streaming platforms, rental options, and purchase locations.`;

  // Format date to match actor page format (month date, year)
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formattedDate = formatDate(dateString);

  // Format end date for TV shows
  const formattedEndDate =
    mediaType === 'tv' && show.last_air_date
      ? formatDate(show.last_air_date)
      : null;
  const rating = getShowRating(show);
  const ratingCount =
    typeof show.vote_count === 'number' && show.vote_count > 0
      ? show.vote_count
      : null;
  const datePublished =
    mediaType === 'tv' ? show.first_air_date : show.release_date;
  const genres = show.genres?.map((genre) => genre.name).filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': mediaType === 'tv' ? 'TVSeries' : 'Movie',
    name: title,
    description,
    image: posterUrl,
    url: canonicalUrl,
    ...(datePublished ? { datePublished } : {}),
    ...(genres && genres.length > 0 ? { genre: genres } : {}),
    ...(rating > 0 && rating < 10 && ratingCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating,
            ratingCount,
            bestRating: 10,
            worstRating: 1,
          },
        }
      : {}),
    potentialAction: {
      '@type': 'WatchAction',
      target: canonicalUrl,
    },
  };

  return (
    <div className='min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]'>
      <JsonLd data={jsonLd} />
      {/* Backdrop */}
      {show.backdrop_path && backdropUrl && (
        <div className='relative h-[60vh] w-full overflow-hidden'>
          <Image
            src={backdropUrl}
            alt={title}
            fill
            className='object-cover'
            priority
            onError={(e) => {
              // Hide broken images to prevent 404s
              const target = e.target as HTMLImageElement;
              if (target.parentElement) {
                target.parentElement.style.display = 'none';
              }
            }}
          />
          <div className='absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent' />
        </div>
      )}

      <div className='container mx-auto px-4 py-8'>
        <div className='flex flex-col md:flex-row gap-8 -mt-32 relative z-10'>
          {/* Poster */}
          <div className='flex-shrink-0'>
            <div className='w-48 md:w-64 aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl'>
              {show.poster_path && posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={title}
                  fill
                  className='object-cover'
                  sizes='(max-width: 768px) 192px, 256px'
                  onError={(e) => {
                    // Hide broken images to prevent 404s
                    const target = e.target as HTMLImageElement;
                    if (target.parentElement) {
                      target.parentElement.style.display = 'none';
                    }
                  }}
                />
              ) : (
                <div className='w-full h-full bg-[#1a1a1a] flex items-center justify-center'>
                  <span className='text-[#FFD700]/50'>No Image</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className='flex-1 text-[#FFD700]'>
            <div className='flex items-center gap-3 mb-4'>
              <h1 className='text-4xl md:text-5xl font-bold'>{title}</h1>
              <span className='px-3 py-1 bg-[#FFD700] text-[#000000] rounded-full text-sm font-semibold'>
                {mediaType === 'tv' ? 'TV Show' : 'Movie'}
              </span>
            </div>

            <div className='flex items-center gap-4 mb-6 text-[#f2f2f1] flex-wrap'>
              <span>
                {mediaType === 'tv' ? (
                  <>
                    {formattedDate}
                    {formattedEndDate && formattedEndDate !== formattedDate ? (
                      <> - {formattedEndDate}</>
                    ) : !show.last_air_date ? (
                      <> - Present</>
                    ) : null}
                  </>
                ) : (
                  formattedDate
                )}
              </span>
              {rating > 0 && rating < 10 && (
                <>
                  <span>•</span>
                  <div className='flex items-center gap-1'>
                    <span className='text-[#FFD700]'>⭐</span>
                    <span>{rating.toFixed(1)}</span>
                  </div>
                </>
              )}
              {show.popularity !== undefined && (
                <>
                  <span>•</span>
                  <HypeMeter popularity={show.popularity} />
                </>
              )}
            </div>

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div className='flex flex-wrap gap-2 mb-6'>
                {show.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className='px-3 py-1 bg-[#1a1a1a] border border-[#FFD700]/30 text-[#FFD700] rounded-full text-sm font-medium'
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <div className='mb-6'>
              <h2 className='text-2xl font-semibold mb-3 text-[#FFD700]'>
                Overview
              </h2>
              <p className='text-[#f2f2f1] text-lg leading-relaxed'>
                {show.overview || 'No overview available.'}
              </p>
            </div>

            {/* Watch Providers */}
            <div className='mt-8'>
              <h2 className='text-2xl font-semibold mb-3 text-[#FFD700]'>
                Where to watch {title}
              </h2>
              <WatchProviders showId={showId} mediaType={mediaType} />
            </div>
          </div>
        </div>

        {/* Cast List */}
        {cast && cast.length > 0 && (
          <div className='mt-8'>
            <CastList cast={cast} />
          </div>
        )}
      </div>
    </div>
  );
}
