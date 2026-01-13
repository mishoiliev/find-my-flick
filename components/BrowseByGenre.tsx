'use client';

import { Genre, MOVIE_GENRES, TV_GENRES } from '@/lib/tmdb';
import { useRouter } from 'next/navigation';
import GenreFilter from './GenreFilter';

export default function BrowseByGenre() {
  const router = useRouter();

  // Combine all genres from movies and TV shows
  // For genres that exist in both, use the movie name (or prefer one)
  const allGenres: Genre[] = [];
  const genreMap = new Map<number, Genre>();

  // Add movie genres
  Object.entries(MOVIE_GENRES).forEach(([id, name]) => {
    genreMap.set(parseInt(id), { id: parseInt(id), name });
  });

  // Add TV genres (only if not already present, or merge similar ones)
  Object.entries(TV_GENRES).forEach(([id, name]) => {
    const genreId = parseInt(id);
    if (!genreMap.has(genreId)) {
      genreMap.set(genreId, { id: genreId, name });
    }
  });

  // Convert to array and sort
  const availableGenres = Array.from(genreMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const handleGenreClick = (genreId: number) => {
    // Navigate to search page with genre filter (type='all' by default)
    router.push(`/search?genres=${genreId}`);
  };

  return (
    <div className='mb-12'>
      <GenreFilter
        genres={availableGenres}
        selectedGenres={[]}
        onGenreToggle={handleGenreClick}
        onClearAll={() => {}}
        clickable={true}
      />
    </div>
  );
}
