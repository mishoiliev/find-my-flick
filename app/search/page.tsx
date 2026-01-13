import type { Metadata } from 'next';
import Pagination from '@/components/Pagination';
import SearchBar from '@/components/SearchBar';
import ShowGrid from '@/components/ShowGrid';
import SearchContent from '@/components/SearchContent';
import { searchShows, discoverShowsByGenre, fetchPopularShows, Show, MOVIE_GENRES, TV_GENRES, Genre } from '@/lib/tmdb';

interface SearchPageProps {
  searchParams: { q?: string; page?: string; genres?: string; type?: string };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = searchParams.q || '';
  const genres = searchParams.genres;
  
  if (genres) {
    const genreIds = genres.split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const type = searchParams.type || 'all';
    const genreMap = type === 'movie' ? MOVIE_GENRES : type === 'tv' ? TV_GENRES : { ...MOVIE_GENRES, ...TV_GENRES };
    const genreNames = genreIds.map(id => genreMap[id]).filter(Boolean).join(', ');
    
    return {
      title: `Browse ${genreNames} - Find my Flick`,
      description: `Browse top ${genreNames} movies and TV shows. Find where to watch them online.`,
      robots: {
        index: true,
        follow: true,
      },
    };
  }
  
  if (query.trim()) {
    return {
      title: `Search Results for "${query}"`,
      description: `Find where to watch "${query}". Search results for movies and TV shows.`,
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  return {
    title: 'Search Movies and TV Shows',
    description: 'Search for movies and TV shows to find where to watch them online.',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const genres = searchParams.genres;
  const type = (searchParams.type || 'all') as 'all' | 'movie' | 'tv';
  const currentPage = parseInt(searchParams.page || '1', 10);

  let allResults: Show[] = [];
  let totalPages = 0;
  let totalResults = 0;
  let selectedGenreIds: number[] = [];

  // Get available genres based on type
  const getAvailableGenres = (): Genre[] => {
    let genreMap: Record<number, string>;
    if (type === 'movie') {
      genreMap = MOVIE_GENRES;
    } else if (type === 'tv') {
      genreMap = TV_GENRES;
    } else {
      // Combine all genres, preferring movie names for duplicates
      // Start with movie genres, then add TV genres (TV will only add unique IDs)
      genreMap = { ...MOVIE_GENRES, ...TV_GENRES };
    }
    return Object.entries(genreMap)
      .map(([id, name]) => ({ id: parseInt(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const availableGenres = getAvailableGenres();

  if (genres) {
    // Fetch shows by genre
    selectedGenreIds = genres
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (selectedGenreIds.length > 0) {
      try {
        // Default to 'all' if no type specified
        const discoverType = type || 'all';
        const discoverResult = await discoverShowsByGenre(
          selectedGenreIds,
          discoverType,
          currentPage,
          50
        );

        allResults = discoverResult.results || [];
        totalPages = discoverResult.total_pages || 0;
        totalResults = discoverResult.total_results || 0;
      } catch (error) {
        console.error('Error fetching shows by genre:', error);
        allResults = [];
        totalPages = 0;
        totalResults = 0;
      }
    }
  } else if (query.trim()) {
    // Regular search
    try {
      const searchResult = await searchShows(query, currentPage, 100);
      allResults = searchResult.results;
      totalPages = searchResult.total_pages;
      totalResults = searchResult.total_results;
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  } else {
    // No genres and no query - show top 50 popular shows
    try {
      allResults = await fetchPopularShows(50);
      totalResults = allResults.length;
      totalPages = 1;
    } catch (error) {
      console.error('Error fetching popular shows:', error);
      allResults = [];
      totalResults = 0;
      totalPages = 0;
    }
  }

  return (
    <main className='min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]'>
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center mb-12'>
          <h1 className='font-playfair text-6xl md:text-8xl mb-4 bg-gradient-to-r from-[#FFE44D] via-[#FFD700] to-[#FFB300] bg-clip-text text-transparent drop-shadow-2xl animate-pulse hover:animate-none transition-all duration-300 hover:scale-105 inline-block tracking-wide font-black leading-[1.2] pb-2 overflow-visible'>
            Find my Flick
          </h1>
          <div className='flex items-center justify-center gap-2 mb-4'>
            <div className='h-1 w-16 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent'></div>
            <div className='h-1 w-2 bg-[#FFD700] rounded-full'></div>
            <div className='h-1 w-16 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent'></div>
          </div>
          <p className='text-xl font-light tracking-wide'>
            Find where to watch your favorite movies and TV shows
          </p>
        </div>

        <SearchBar />

        <div className='mt-12'>
          {query.trim() ? (
            // For search queries, use server-side rendering with pagination
            <>
              <div className='mb-6'>
                <h2 className='text-3xl font-semibold text-[#FFD700] mb-2'>
                  Search Results for &quot;{query}&quot;
                </h2>
                {totalResults > 0 && (
                  <p className='text-[#f2f2f1]'>
                    Found {totalResults} result{totalResults !== 1 ? 's' : ''}
                    {totalPages > 1 && (
                      <span>
                        {' '}
                        (Page {currentPage} of {totalPages})
                      </span>
                    )}
                  </p>
                )}
              </div>
              {allResults.length > 0 ? (
                <>
                  <ShowGrid shows={allResults.slice(0, 36)} gridLayout="search" />
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    query={query}
                  />
                </>
              ) : (
                <div className='text-center py-12'>
                  <p className='text-[#f2f2f1] text-lg'>
                    No results found for &quot;{query}&quot;
                  </p>
                </div>
              )}
            </>
          ) : (
            // For genre browsing and popular shows, use client-side component
            <SearchContent
              initialShows={allResults}
              selectedGenreIds={selectedGenreIds}
              type={type}
              initialTotalResults={totalResults}
              availableGenres={availableGenres}
            />
          )}
        </div>
      </div>
    </main>
  );
}

