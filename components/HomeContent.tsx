'use client';

import { Genre, MOVIE_GENRES, Show, TV_GENRES } from '@/lib/tmdb';
import { useEffect, useState } from 'react';
import ShowGrid from './ShowGrid';

interface HomeContentProps {
  popularMovies: Show[];
  popularTVShows: Show[];
  selectedGenreIds: number[];
}

export default function HomeContent({
  popularMovies,
  popularTVShows,
  selectedGenreIds,
}: HomeContentProps) {
  const [filteredShows, setFilteredShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Get available genres for display
  const getAvailableGenres = (): Genre[] => {
    const genreMap = new Map<number, Genre>();

    // Add movie genres
    Object.entries(MOVIE_GENRES).forEach(([id, name]) => {
      genreMap.set(parseInt(id), { id: parseInt(id), name });
    });

    // Add TV genres (only if not already present)
    Object.entries(TV_GENRES).forEach(([id, name]) => {
      const genreId = parseInt(id);
      if (!genreMap.has(genreId)) {
        genreMap.set(genreId, { id: genreId, name });
      }
    });

    return Array.from(genreMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  };

  const availableGenres = getAvailableGenres();

  // Fetch shows by genre when genres are selected
  useEffect(() => {
    if (selectedGenreIds.length > 0) {
      setLoading(true);
      const fetchShows = async () => {
        try {
          const genreIdsParam = selectedGenreIds.join(',');
          const response = await fetch(
            `/api/tmdb/discover?genres=${genreIdsParam}&type=all&page=1&maxResults=50`,
            {
              cache: 'force-cache', // Use browser cache
            }
          );
          if (response.ok) {
            const data = await response.json();
            setFilteredShows(data.results || []);
            setTotalResults(data.total_results || 0);
          } else {
            setFilteredShows([]);
            setTotalResults(0);
          }
        } catch (error) {
          console.error('Error fetching shows by genre:', error);
          setFilteredShows([]);
          setTotalResults(0);
        } finally {
          setLoading(false);
        }
      };
      fetchShows();
    } else {
      // Clear filtered shows when no genres are selected
      setFilteredShows([]);
      setTotalResults(0);
      setLoading(false);
    }
  }, [selectedGenreIds]);

  // Get genre names for display
  const getGenreNames = () => {
    return selectedGenreIds
      .map((id) => availableGenres.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  // If genres are selected, show filtered results
  if (selectedGenreIds.length > 0) {
    return (
      <div className='mt-12'>
        <div className='mb-6'>
          <h2 className='text-3xl font-semibold text-[#FFD700] mb-2'>
            Top {getGenreNames()}
          </h2>
          {totalResults > 0 && !loading && (
            <p className='text-[#f2f2f1]'>
              Found {totalResults} result{totalResults !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6'>
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className='aspect-[2/3] bg-[#1a1a1a] rounded-lg animate-pulse'
              />
            ))}
          </div>
        ) : filteredShows.length > 0 ? (
          <ShowGrid shows={filteredShows} />
        ) : (
          <div className='text-center py-12'>
            <p className='text-[#f2f2f1] text-lg'>
              No results found for the selected genre
              {selectedGenreIds.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default state: show popular movies and TV shows
  return (
    <div className='mt-12 space-y-12'>
      <div>
        <h2 className='text-3xl font-semibold text-[#FFD700] mb-6'>
          Popular Movies
        </h2>
        <ShowGrid shows={popularMovies} />
      </div>

      <div>
        <h2 className='text-3xl font-semibold text-[#FFD700] mb-6'>
          Popular TV Shows
        </h2>
        <ShowGrid shows={popularTVShows} />
      </div>
    </div>
  );
}
