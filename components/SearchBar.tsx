'use client';

import {
  getShowRating,
  Show,
  sortShowsByPopularity,
} from '@/lib/tmdb';
import Fuse from 'fuse.js';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Show[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [fuse, setFuse] = useState<Fuse<Show> | null>(null);
  const initializingRef = useRef(false);

  // One CDN-cached catalog powers instant suggestions. Comprehensive TMDB
  // search only happens after an explicit form submission on /search.
  const initializeSearch = useCallback(async () => {
    if (fuse || initializingRef.current) return;
    initializingRef.current = true;

    try {
      const response = await fetch('/api/shows?type=all&page=1', {
        cache: 'default',
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const data = (await response.json()) as { results?: Show[] };
      const shows = data.results || [];
      setFuse(
        new Fuse(shows, {
          keys: [
            { name: 'title', weight: 0.7 },
            { name: 'name', weight: 0.7 },
            { name: 'overview', weight: 0.3 },
          ],
          threshold: 0.4,
          includeScore: true,
          minMatchCharLength: 2,
        })
      );
    } catch (error) {
      console.error('Error initializing search suggestions:', error);
    } finally {
      initializingRef.current = false;
    }
  }, [fuse]);

  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!fuse || normalizedQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
      const matches = fuse
        .search(query)
        .map((result) => result.item)
        .filter((show) => {
          const title = (show.title || show.name || '').toLowerCase();
          const overview = (show.overview || '').toLowerCase();
          return searchTerms.every(
            (term) => title.includes(term) || overview.includes(term)
          );
        });

      setResults(sortShowsByPopularity(matches).slice(0, 15));
      setShowResults(true);
    }, 100);

    return () => window.clearTimeout(timeout);
  }, [fuse, query]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (!fuse) void initializeSearch();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;
    setShowResults(false);
    router.push(`/search?q=${encodeURIComponent(normalizedQuery.slice(0, 100))}`);
  };

  const handleResultClick = (show: Show) => {
    setShowResults(false);
    setQuery('');
    router.push(`/show/${show.media_type || 'movie'}/${show.id}`);
  };

  return (
    <div className='relative w-full max-w-3xl mx-auto'>
      <form onSubmit={handleSubmit} className='relative'>
        <input
          type='search'
          name='query'
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => void initializeSearch()}
          maxLength={100}
          autoComplete='off'
          placeholder='Search for movies and TV shows...'
          className='w-full px-6 py-4 text-lg rounded-full bg-[#1a1a1a] text-[#FFD700] placeholder-[#FFD700]/50 border-2 border-[#FFD700]/30 focus:border-[#FFD700] focus:outline-none transition-colors'
        />
        <button
          type='submit'
          className='absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-[#FFD700] hover:bg-[#FFB300] text-[#000000] rounded-full font-semibold transition-colors'
        >
          Search
        </button>
      </form>

      {showResults && results.length > 0 && (
        <div className='absolute z-50 w-full mt-2 bg-[#1a1a1a] rounded-lg shadow-2xl max-h-96 overflow-y-auto border border-[#FFD700]/30'>
          {results.map((show) => (
            <button
              key={`${show.media_type}-${show.id}`}
              type='button'
              onClick={() => handleResultClick(show)}
              className='w-full px-4 py-3 flex items-center gap-4 hover:bg-[#FFD700]/10 transition-colors text-left border-b border-[#FFD700]/20 last:border-b-0'
            >
              {show.poster_path && (
                <div className='relative w-16 h-24 flex-shrink-0'>
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${
                      show.poster_path.startsWith('/')
                        ? show.poster_path
                        : `/${show.poster_path}`
                    }`}
                    alt={show.title || show.name || 'Show poster'}
                    fill
                    className='object-cover rounded'
                    sizes='64px'
                  />
                </div>
              )}
              <div className='flex-1 min-w-0'>
                <h3 className='text-[#FFD700] font-semibold truncate'>
                  {show.title || show.name}
                </h3>
                <p className='text-[#f2f2f1]/80 text-sm mt-1 line-clamp-2'>
                  {show.overview}
                </p>
                <div className='flex items-center gap-2 mt-2'>
                  <span className='text-xs bg-[#FFD700] text-[#000000] px-2 py-1 rounded'>
                    {show.media_type === 'tv' ? 'TV' : 'Movie'}
                  </span>
                  {getShowRating(show) > 0 && getShowRating(show) < 10 && (
                    <span className='text-xs text-[#FFD700] flex items-center gap-1'>
                      <span>⭐</span>
                      {getShowRating(show).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && (
        <div
          className='fixed inset-0 z-40'
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
