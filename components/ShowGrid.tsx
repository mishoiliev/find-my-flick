'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Show, getShowTitle, getPosterUrl, getShowDate } from '@/lib/tmdb';

interface ShowGridProps {
  shows: Show[];
}

export default function ShowGrid({ shows }: ShowGridProps) {
  if (shows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#FFD700]/70 text-lg">No shows found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {shows.map((show) => {
        const title = getShowTitle(show);
        const posterUrl = getPosterUrl(show.poster_path);
        const date = getShowDate(show);
        const mediaType = show.media_type || 'movie';

        return (
          <Link
            key={`${mediaType}-${show.id}`}
            href={`/show/${mediaType}/${show.id}`}
            className="group relative overflow-hidden rounded-lg bg-[#1a1a1a] border border-[#FFD700]/20 hover:border-[#FFD700]/50 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-[#FFD700]/20"
          >
            <div className="aspect-[2/3] relative">
              {show.poster_path ? (
                <Image
                  src={posterUrl}
                  alt={title}
                  fill
                  className="object-cover group-hover:opacity-80 transition-opacity"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              ) : (
                <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                  <span className="text-[#FFD700]/50 text-sm">No Image</span>
                </div>
              )}
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex flex-col items-center justify-center">
                {/* Title - centered, only visible on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4">
                  <h3 className="text-[#FFD700] font-semibold text-sm md:text-base text-center line-clamp-2">
                    {title}
                  </h3>
                </div>
                
                {/* Year and Rating - at bottom with padding, only visible on hover */}
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center justify-between text-xs text-[#f2f2f1]">
                    <span>{date.split('-')[0]}</span>
                    <div className="flex items-center gap-1">
                      <span>⭐</span>
                      <span>{show.vote_average.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
