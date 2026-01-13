'use client';

import { Genre, MOVIE_GENRES, TV_GENRES } from '@/lib/tmdb';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import GenreFilter from './GenreFilter';

export default function BrowseByGenre() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Get selected genres from URL
  const selectedGenresParam = searchParams.get('genres');
  const selectedGenres = useMemo(() => {
    return selectedGenresParam
      ? selectedGenresParam
          .split(',')
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id))
      : [];
  }, [selectedGenresParam]);

  const handleGenreToggle = useCallback(
    (genreId: number) => {
      const currentGenres = selectedGenres;
      const newGenres = currentGenres.includes(genreId)
        ? currentGenres.filter((id) => id !== genreId)
        : [...currentGenres, genreId];

      // Update URL with new genres
      const params = new URLSearchParams(searchParams.toString());
      if (newGenres.length > 0) {
        params.set('genres', newGenres.join(','));
      } else {
        params.delete('genres');
      }

      // Update URL - navigate to root if no params, otherwise include params
      const newUrl = params.toString() ? `/?${params.toString()}` : '/';
      router.push(newUrl, { scroll: false });
    },
    [selectedGenres, searchParams, router]
  );

  const handleClearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('genres');

    // Navigate to root if no params left, otherwise keep other params
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    router.push(newUrl, { scroll: false });
  }, [searchParams, router]);

  return (
    <div className='mb-12'>
      <GenreFilter
        genres={availableGenres}
        selectedGenres={selectedGenres}
        onGenreToggle={handleGenreToggle}
        onClearAll={handleClearAll}
        clickable={false}
      />
    </div>
  );
}
