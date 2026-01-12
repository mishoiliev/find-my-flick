import type { Metadata } from 'next';
import Pagination from '@/components/Pagination';
import SearchBar from '@/components/SearchBar';
import ShowGrid from '@/components/ShowGrid';
import { searchShows, Show } from '@/lib/tmdb';

interface SearchPageProps {
  searchParams: { q?: string; page?: string };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = searchParams.q || '';
  
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
  const currentPage = parseInt(searchParams.page || '1', 10);

  let allResults: Show[] = [];
  let totalPages = 0;
  let totalResults = 0;

  if (query.trim()) {
    try {
      // Fetch results for current page (we need at least 36 items for 6x6 grid)
      // Request more results to ensure we have enough after filtering/sorting
      const searchResult = await searchShows(query, currentPage, 100);

      allResults = searchResult.results;
      totalPages = searchResult.total_pages;
      totalResults = searchResult.total_results;
    } catch (error) {
      console.error('Error fetching search results:', error);
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
            <div className='text-center py-12'>
              <p className='text-[#f2f2f1] text-lg'>
                Enter a search query to find movies and TV shows
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
