'use client';

import { Genre, Show } from '@/lib/tmdb';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Pagination from './Pagination';
import SearchGenreFilter from './SearchGenreFilter';
import ShowGrid from './ShowGrid';

interface SearchContentProps {
  initialShows: Show[];
  availableGenres: Genre[];
}

type SearchResponse = {
  results?: Show[];
  total_results?: number;
  total_pages?: number;
};

export default function SearchContent({
  initialShows,
  availableGenres,
}: SearchContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const typeParam = searchParams.get('type');
  const type: 'all' | 'movie' | 'tv' =
    typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all';
  const currentPage = Math.max(
    1,
    Math.min(500, parseInt(searchParams.get('page') || '1', 10) || 1)
  );
  const genresParam = searchParams.get('genres') || '';
  const selectedGenreIds = useMemo(
    () =>
      genresParam
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => Number.isInteger(id) && id > 0),
    [genresParam]
  );

  const hasRemoteQuery = query.length > 0 || selectedGenreIds.length > 0;
  const isInitialCatalog = !hasRemoteQuery && type === 'all';
  const [shows, setShows] = useState<Show[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState('');

  const requestUrl = useMemo(() => {
    if (isInitialCatalog) return '';

    const params = new URLSearchParams();
    let endpoint: string;
    if (query) {
      params.set('q', query.slice(0, 100));
      params.set('page', String(currentPage));
      endpoint = '/api/tmdb/search';
    } else if (selectedGenreIds.length > 0) {
      params.set(
        'genres',
        selectedGenreIds.slice(0, 8).sort((a, b) => a - b).join(',')
      );
      params.set('type', type);
      params.set('page', '1');
      params.set('maxResults', '50');
      endpoint = '/api/tmdb/discover';
    } else {
      params.set('type', type);
      params.set('limit', '50');
      endpoint = '/api/tmdb/popular';
    }
    return `${endpoint}?${params.toString()}`;
  }, [currentPage, isInitialCatalog, query, selectedGenreIds, type]);

  useEffect(() => {
    if (!requestUrl) return;

    const controller = new AbortController();
    fetch(requestUrl, {
      cache: 'default',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return (await response.json()) as SearchResponse;
      })
      .then((data) => {
        const results = data.results || [];
        setShows(results);
        setTotalResults(data.total_results ?? results.length);
        setTotalPages(data.total_pages ?? 1);
        setLoadedRequest(requestUrl);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error loading search results:', error);
        setShows([]);
        setTotalResults(0);
        setTotalPages(0);
        setLoadedRequest(requestUrl);
      });

    return () => controller.abort();
  }, [requestUrl]);

  const handleGenreChange = (genreIds: number[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    if (genreIds.length > 0) {
      params.set('genres', [...genreIds].sort((a, b) => a - b).join(','));
    } else {
      params.delete('genres');
    }
    router.push(params.size > 0 ? `/search?${params}` : '/search', {
      scroll: false,
    });
  };

  const genreNames = selectedGenreIds
    .map((id) => availableGenres.find((genre) => genre.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  const displayedShows = isInitialCatalog ? initialShows : shows;
  const displayedTotalResults = isInitialCatalog
    ? initialShows.length
    : totalResults;
  const displayedTotalPages = isInitialCatalog ? 1 : totalPages;
  const isLoading = !isInitialCatalog && loadedRequest !== requestUrl;

  return (
    <>
      {!query && (
        <div className='mb-6'>
          <SearchGenreFilter
            availableGenres={availableGenres}
            selectedGenreIds={selectedGenreIds}
            type={type}
            onGenreChange={handleGenreChange}
          />
        </div>
      )}

      <div className='mb-6'>
        <h2 className='text-3xl font-semibold text-[#FFD700] mb-2'>
          {query
            ? `Search Results for "${query}"`
            : selectedGenreIds.length > 0
              ? `Top ${genreNames}`
              : 'Most Popular Titles'}
        </h2>
        {displayedTotalResults > 0 && !isLoading && (
          <p className='text-[#f2f2f1]'>
            {query || selectedGenreIds.length > 0
              ? `Found ${displayedTotalResults} result${displayedTotalResults === 1 ? '' : 's'}`
              : `Showing the top ${displayedTotalResults} movies and TV shows`}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6'>
          {Array.from({ length: 18 }).map((_, index) => (
            <div
              key={index}
              className='aspect-[2/3] bg-[#1a1a1a] rounded-lg animate-pulse'
            />
          ))}
        </div>
      ) : displayedShows.length > 0 ? (
        <>
          <ShowGrid shows={displayedShows.slice(0, 36)} gridLayout='search' />
          {query && (
            <Pagination
              currentPage={currentPage}
              totalPages={displayedTotalPages}
              query={query}
            />
          )}
        </>
      ) : (
        <div className='text-center py-12'>
          <p className='text-[#f2f2f1] text-lg'>No results found.</p>
        </div>
      )}
    </>
  );
}
