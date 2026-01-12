'use client';

import { performSearch, searchShowsAction } from '@/app/actions/search';
import { Show, sortShowsByPopularity } from '@/lib/tmdb';
import Fuse from 'fuse.js';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Show[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allShows, setAllShows] = useState<Show[]>([]);
  const [fuse, setFuse] = useState<Fuse<Show> | null>(null);

  // Refs for debouncing and tracking current search
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSearchQueryRef = useRef<string>('');

  // Initialize Fuse.js with all shows for client-side fuzzy search
  useEffect(() => {
    async function initializeSearch() {
      try {
        // Fetch a large dataset for client-side search
        const [moviesRes, tvRes] = await Promise.all([
          fetch(`/api/shows?type=movie&page=1`),
          fetch(`/api/shows?type=tv&page=1`),
        ]);

        const moviesData = await moviesRes.json();
        const tvData = await tvRes.json();

        const combined = [
          ...moviesData.results.map((m: Show) => ({
            ...m,
            media_type: 'movie' as const,
          })),
          ...tvData.results.map((t: Show) => ({
            ...t,
            media_type: 'tv' as const,
          })),
        ];

        setAllShows(combined);

        // Configure Fuse.js for advanced search
        const fuseInstance = new Fuse(combined, {
          keys: [
            { name: 'title', weight: 0.7 },
            { name: 'name', weight: 0.7 },
            { name: 'overview', weight: 0.3 },
          ],
          threshold: 0.4, // Lower = more strict matching
          includeScore: true,
          minMatchCharLength: 2,
        });

        setFuse(fuseInstance);
      } catch (error) {
        console.error('Error initializing search:', error);
      }
    }

    initializeSearch();
  }, []);

  // Client-side fuzzy search with debounce
  const handleClientSearch = useCallback(
    (searchQuery: string) => {
      // Clear previous timeout
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }

      if (!fuse || !searchQuery.trim()) {
        setResults([]);
        setShowResults(false);
        currentSearchQueryRef.current = '';
        return;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();
      currentSearchQueryRef.current = normalizedQuery;

      // Debounce client-side search (100ms for instant feel)
      clientSearchTimeoutRef.current = setTimeout(() => {
        // Double-check query still matches before showing results
        if (currentSearchQueryRef.current !== normalizedQuery) {
          return;
        }

        const searchResults = fuse.search(searchQuery);
        const matches = searchResults.map((result) => result.item);

        // Filter matches to ensure they actually match the query
        const searchTerms = normalizedQuery
          .split(' ')
          .filter((term) => term.length > 0);
        const filteredMatches = matches.filter((show) => {
          const title = (show.title || show.name || '').toLowerCase();
          const overview = (show.overview || '').toLowerCase();

          // Check if all search terms appear in title or overview
          return searchTerms.every(
            (term) => title.includes(term) || overview.includes(term)
          );
        });

        // Only update if query still matches
        if (currentSearchQueryRef.current === normalizedQuery) {
          // Sort by popularity and prioritize items with posters
          const sortedMatches = sortShowsByPopularity(filteredMatches);
          setResults(sortedMatches.slice(0, 15)); // Show top 15 results
          setShowResults(true);
        }
      }, 100);
    },
    [fuse]
  );

  // Server-side search (for more comprehensive results) with caching
  // This only updates the dropdown results - navigation happens on form submit
  const handleServerSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      currentSearchQueryRef.current = '';
      return;
    }

    // Update the current search query ref
    currentSearchQueryRef.current = searchQuery.trim().toLowerCase();
    const normalizedQuery = searchQuery.trim().toLowerCase();

    setIsSearching(true);
    setShowResults(true);

    try {
      // Use server action for search
      const sortedResults = await searchShowsAction(searchQuery);

      // Only update results if the query still matches (prevents stale results)
      if (currentSearchQueryRef.current === normalizedQuery) {
        // Filter results to ensure they match the current query
        // This adds an extra layer of protection against cached mismatched results
        const filteredResults = sortedResults.filter((show) => {
          const title = (show.title || show.name || '').toLowerCase();
          const overview = (show.overview || '').toLowerCase();
          const searchTerms = normalizedQuery
            .split(' ')
            .filter((term) => term.length > 0);

          // Check if all search terms appear in title or overview
          return searchTerms.every(
            (term) => title.includes(term) || overview.includes(term)
          );
        });

        setResults(filteredResults);
      }
      // If query doesn't match, ignore these results (newer search is in progress)
    } catch (error) {
      console.error('Search error:', error);
      // Only clear results if this is still the current query
      if (currentSearchQueryRef.current === normalizedQuery) {
        setResults([]);
      }
    } finally {
      // Only update loading state if this is still the current query
      if (currentSearchQueryRef.current === normalizedQuery) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!value.trim()) {
      currentSearchQueryRef.current = '';
      setResults([]);
      setShowResults(false);
      return;
    }

    // Update current search query ref immediately
    const normalizedValue = value.trim().toLowerCase();
    currentSearchQueryRef.current = normalizedValue;

    // Immediate client-side fuzzy search for instant results
    handleClientSearch(value);

    // Debounced server search for comprehensive results (500ms delay)
    debounceTimeoutRef.current = setTimeout(() => {
      // Double-check the value hasn't changed during the debounce
      const currentNormalized = value.trim().toLowerCase();
      if (
        currentNormalized &&
        currentSearchQueryRef.current === currentNormalized
      ) {
        handleServerSearch(value);
      } else if (!value.trim()) {
        setResults([]);
        setShowResults(false);
        currentSearchQueryRef.current = '';
      }
    }, 500);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
    };
  }, []);

  const handleResultClick = (show: Show) => {
    setShowResults(false);
    setQuery('');
    router.push(`/show/${show.media_type || 'movie'}/${show.id}`);
  };

  return (
    <div className='relative w-full max-w-3xl mx-auto'>
      <form action={performSearch} className='relative'>
        <input
          type='text'
          name='query'
          value={query}
          onChange={handleInputChange}
          placeholder='Search for movies and TV shows...'
          className='w-full px-6 py-4 text-lg rounded-full bg-[#1a1a1a] text-[#FFD700] placeholder-[#FFD700]/50 border-2 border-[#FFD700]/30 focus:border-[#FFD700] focus:outline-none transition-colors'
        />
        <button
          type='submit'
          disabled={isSearching}
          className='absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-[#FFD700] hover:bg-[#FFB300] text-[#000000] rounded-full font-semibold transition-colors disabled:opacity-50'
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className='absolute z-50 w-full mt-2 bg-[#1a1a1a] rounded-lg shadow-2xl max-h-96 overflow-y-auto border border-[#FFD700]/30'>
          {results.map((show) => (
            <button
              key={`${show.media_type}-${show.id}`}
              onClick={() => handleResultClick(show)}
              className='w-full px-4 py-3 flex items-center gap-4 hover:bg-[#FFD700]/10 transition-colors text-left border-b border-[#FFD700]/20 last:border-b-0'
            >
              {show.poster_path && (
                <div className='relative w-16 h-24 flex-shrink-0'>
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${show.poster_path}`}
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
                  {show.vote_average > 0 && (
                    <span className='text-xs text-[#FFD700]'>
                      ⭐ {show.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className='fixed inset-0 z-40'
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
