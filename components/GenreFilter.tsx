'use client';

import { Genre } from '@/lib/tmdb';

interface GenreFilterProps {
  genres: Genre[];
  selectedGenres: number[];
  onGenreToggle: (genreId: number) => void;
  onClearAll: () => void;
  clickable?: boolean; // If true, clicking navigates instead of toggling
}

export default function GenreFilter({
  genres,
  selectedGenres,
  onGenreToggle,
  onClearAll,
  clickable = false,
}: GenreFilterProps) {
  if (genres.length === 0) {
    return null;
  }

  return (
    <div className='mb-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xl font-semibold text-[#FFD700]'>
          {clickable ? 'Browse by Genre' : 'Filter by Genre'}
        </h3>
        {!clickable && selectedGenres.length > 0 && (
          <button
            onClick={onClearAll}
            className='text-sm text-[#FFD700]/70 hover:text-[#FFD700] transition-colors underline'
          >
            Clear all
          </button>
        )}
      </div>
      <div className='flex flex-wrap gap-2'>
        {genres.map((genre) => {
          const isSelected = selectedGenres.includes(genre.id);
          return (
            <button
              key={genre.id}
              onClick={() => onGenreToggle(genre.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-[#FFD700] text-[#0f0f0f] border-2 border-[#FFD700]'
                  : 'bg-[#1a1a1a] text-[#FFD700] border-2 border-[#FFD700]/30 hover:border-[#FFD700]/60 hover:bg-[#1a1a1a]/80'
              }`}
            >
              {genre.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
