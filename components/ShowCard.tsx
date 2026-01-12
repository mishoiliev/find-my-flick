'use client';

import {
  Show,
  getPosterUrl,
  getShowDate,
  getShowRating,
  getShowTitle,
} from '@/lib/tmdb';
import Image from 'next/image';
import Link from 'next/link';
import IMDBIcon from './IMDBIcon';

/**
 * ShowCard - Abstracted component for displaying show/movie cards
 * Used consistently across /search, /actor, and homepage via ShowGrid
 * Always displays IMDB rating when available (via getShowRating)
 */
interface ShowCardProps {
  show: Show;
  gridLayout?: 'default' | 'compact' | 'search';
}

export default function ShowCard({
  show,
  gridLayout = 'default',
}: ShowCardProps) {
  const title = getShowTitle(show);
  const posterUrl = getPosterUrl(show.poster_path);
  const date = getShowDate(show);
  const mediaType = show.media_type || 'movie';
  // getShowRating prefers IMDB rating, falls back to TMDB vote_average
  const rating = getShowRating(show);

  const imageSizes =
    gridLayout === 'compact'
      ? '(max-width: 768px) 50vw, 25vw'
      : gridLayout === 'search'
      ? '(max-width: 640px) 50vw, (max-width: 1024px) 20vw, 16.67vw'
      : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw';

  return (
    <Link
      href={`/show/${mediaType}/${show.id}`}
      className={`group relative overflow-hidden rounded-lg bg-[#1a1a1a] border border-[#FFD700]/20 hover:border-[#FFD700]/50 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20 ${
        gridLayout === 'search' ? 'h-full w-full' : ''
      }`}
    >
      <div className='aspect-[2/3] relative'>
        {show.poster_path ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            className='object-cover group-hover:opacity-80 transition-opacity'
            sizes={imageSizes}
          />
        ) : (
          <div className='w-full h-full bg-[#1a1a1a] flex items-center justify-center'>
            <span className='text-[#FFD700]/50 text-sm'>No Image</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex flex-col items-center justify-center'>
          {/* Title - centered, only visible on hover */}
          <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4'>
            <h3 className='text-[#FFD700] font-semibold text-sm md:text-base text-center line-clamp-2'>
              {title}
            </h3>
          </div>

          {/* Year and Rating - at bottom with padding, only visible on hover */}
          {/* Rating displays IMDB rating when available (via getShowRating) */}
          <div className='absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
            <div className='flex items-center justify-between text-xs text-[#f2f2f1]'>
              <span>{date.split('-')[0]}</span>
              {rating > 0 && rating < 10 && (
                <div className='flex items-center gap-1'>
                  <span>⭐</span>
                  <span>{rating.toFixed(1)}</span>
                  {/* Show IMDB icon when rating is from IMDB */}
                  {show.imdb_rating !== undefined && (
                    <IMDBIcon className='w-4 h-4' />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
