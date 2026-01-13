'use client';

import { Genre, Show } from '@/lib/tmdb';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import GenreFilter from './GenreFilter';
import ShowGrid from './ShowGrid';

interface FilteredShowGridProps {
  shows: Show[];
  title: string;
  mediaType: 'movie' | 'tv';
}

export default function FilteredShowGrid({
  shows,
  title,
  mediaType,
}: FilteredShowGridProps) {
  const router = useRouter();

  // Extract all unique genres from the shows
  const availableGenres = useMemo(() => {
    const genreMap = new Map<number, Genre>();
    shows.forEach((show) => {
      if (show.genres) {
        show.genres.forEach((genre) => {
          if (!genreMap.has(genre.id)) {
            genreMap.set(genre.id, genre);
          }
        });
      }
    });
    // Sort genres by name
    return Array.from(genreMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [shows]);

  const handleGenreClick = (genreId: number) => {
    // Navigate to search page with genre filter
    router.push(`/search?genres=${genreId}&type=${mediaType}`);
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-3xl font-semibold text-[#FFD700]'>{title}</h2>
      </div>

      {availableGenres.length > 0 && (
        <GenreFilter
          genres={availableGenres}
          selectedGenres={[]}
          onGenreToggle={handleGenreClick}
          onClearAll={() => {}}
          clickable={true}
        />
      )}

      <ShowGrid shows={shows} />
    </div>
  );
}
