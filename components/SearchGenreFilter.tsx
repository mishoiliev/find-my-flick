'use client';

import { useState, useEffect } from 'react';
import { Genre } from '@/lib/tmdb';
import GenreFilter from './GenreFilter';

interface SearchGenreFilterProps {
  availableGenres: Genre[];
  selectedGenreIds: number[];
  type: 'all' | 'movie' | 'tv';
  onGenreChange?: (genreIds: number[]) => void;
}

export default function SearchGenreFilter({
  availableGenres,
  selectedGenreIds: initialSelectedGenreIds,
  type,
  onGenreChange,
}: SearchGenreFilterProps) {
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>(initialSelectedGenreIds);

  // Sync with prop changes
  useEffect(() => {
    setSelectedGenreIds(initialSelectedGenreIds);
  }, [initialSelectedGenreIds]);

  const handleGenreToggle = (genreId: number) => {
    const newSelected = selectedGenreIds.includes(genreId)
      ? selectedGenreIds.filter((id) => id !== genreId)
      : [...selectedGenreIds, genreId];

    setSelectedGenreIds(newSelected);
    
    // Call callback instead of navigating
    if (onGenreChange) {
      onGenreChange(newSelected);
    }
  };

  const handleClearAll = () => {
    setSelectedGenreIds([]);
    if (onGenreChange) {
      onGenreChange([]);
    }
  };

  return (
    <GenreFilter
      genres={availableGenres}
      selectedGenres={selectedGenreIds}
      onGenreToggle={handleGenreToggle}
      onClearAll={handleClearAll}
      clickable={false}
    />
  );
}
