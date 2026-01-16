'use client';

import { Genre, Show } from '@/lib/tmdb';
import { useEffect, useState } from 'react';
import SearchGenreFilter from './SearchGenreFilter';
import ShowGrid from './ShowGrid';

interface SearchContentProps {
  initialShows: Show[];
  selectedGenreIds: number[];
  type: 'all' | 'movie' | 'tv';
  query?: string;
  initialTotalResults?: number;
  availableGenres: Genre[];
}

export default function SearchContent({
  initialShows,
  selectedGenreIds: initialSelectedGenreIds,
  type,
  query,
  initialTotalResults = 0,
  availableGenres,
}: SearchContentProps) {
  const [shows, setShows] = useState<Show[]>(initialShows);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(initialTotalResults);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>(
    initialSelectedGenreIds
  );

  // Track previous values to detect changes
  const [prevValues, setPrevValues] = useState<string>('');

  // Update when genre selection or type changes (skip initial mount)
  useEffect(() => {
    const currentGenreIdsStr = [...selectedGenreIds].sort().join(',');
    const currentKey = `${currentGenreIdsStr}-${type}`;

    // Skip if this is the initial mount and we have initial data
    if (prevValues === '' && initialShows.length > 0) {
      setPrevValues(currentKey);
      return;
    }

    // Skip if nothing has changed
    if (prevValues === currentKey) {
      return;
    }

    setPrevValues(currentKey);

    const fetchShows = async () => {
      if (selectedGenreIds.length === 0 && !query) {
        // Fetch popular shows
        setLoading(true);
        try {
          const response = await fetch(
            `/api/tmdb/popular?type=${type}&limit=50`,
            {
              cache: 'force-cache', // Use browser cache
            }
          );
          if (response.ok) {
            const data = await response.json();
            setShows(data.results || []);
            setTotalResults(data.results?.length || 0);
          }
        } catch (error) {
          console.error('Error fetching popular shows:', error);
          setShows([]);
          setTotalResults(0);
        } finally {
          setLoading(false);
        }
      } else if (selectedGenreIds.length > 0) {
        // Fetch shows by genre
        setLoading(true);
        try {
          const genreIdsParam = selectedGenreIds.join(',');
          const response = await fetch(
            `/api/tmdb/discover?genres=${genreIdsParam}&type=${type}&page=1&maxResults=50`,
            {
              cache: 'force-cache', // Use browser cache
            }
          );
          if (response.ok) {
            const data = await response.json();
            setShows(data.results || []);
            setTotalResults(data.total_results || 0);
          } else {
            setShows([]);
            setTotalResults(0);
          }
        } catch (error) {
          console.error('Error fetching shows by genre:', error);
          setShows([]);
          setTotalResults(0);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchShows();
  }, [selectedGenreIds, type, query, initialShows, prevValues]);

  // Update when initial props change (for server-side updates like search)
  useEffect(() => {
    if (query) {
      setShows(initialShows);
      setTotalResults(initialTotalResults);
    }
  }, [query, initialShows, initialTotalResults]);

  const handleGenreChange = (genreIds: number[]) => {
    setSelectedGenreIds(genreIds);
  };

  // Get genre names for display
  const getGenreNames = () => {
    return selectedGenreIds
      .map((id) => availableGenres.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <>
      {/* Always show genre filter */}
      <div className='mb-6'>
        <SearchGenreFilter
          availableGenres={availableGenres}
          selectedGenreIds={selectedGenreIds}
          type={type}
          onGenreChange={handleGenreChange}
        />
      </div>

      {/* Show heading and results count */}
      {selectedGenreIds.length > 0 ? (
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
      ) : query ? (
        <div className='mb-6'>
          <h2 className='text-3xl font-semibold text-[#FFD700] mb-2'>
            Search Results for &quot;{query}&quot;
          </h2>
          {totalResults > 0 && (
            <p className='text-[#f2f2f1]'>
              Found {totalResults} result{totalResults !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      ) : (
        <div className='mb-6'>
          <h2 className='text-3xl font-semibold text-[#FFD700] mb-2'>
            Most Popular Titles
          </h2>
          {totalResults > 0 && !loading && (
            <p className='text-[#f2f2f1]'>
              Showing top {totalResults} most popular movies and TV shows
            </p>
          )}
        </div>
      )}

      {/* Show loading state or results */}
      {loading ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6'>
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className='aspect-[2/3] bg-[#1a1a1a] rounded-lg animate-pulse'
            />
          ))}
        </div>
      ) : shows.length > 0 ? (
        <ShowGrid shows={shows} gridLayout='search' />
      ) : (
        <div className='text-center py-12'>
          <p className='text-[#f2f2f1] text-lg'>
            {selectedGenreIds.length > 0
              ? `No results found for the selected genre${
                  selectedGenreIds.length > 1 ? 's' : ''
                }`
              : query
              ? `No results found for "${query}"`
              : 'No popular shows available at the moment'}
          </p>
        </div>
      )}
    </>
  );
}
