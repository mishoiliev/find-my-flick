import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import SearchContent from '@/components/SearchContent';
import {
  fetchPopularShows,
  Genre,
  MOVIE_GENRES,
  TV_GENRES,
} from '@/lib/tmdb';
import type { Metadata } from 'next';
import { Suspense } from 'react';

// Search parameters are handled in the browser so this route remains a single
// cached shell. Only the requested TMDB dataset can reach a Function.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Search Movies and TV Shows',
  description: 'Search for movies and TV shows and find where to watch them.',
  robots: {
    index: false,
    follow: true,
  },
};

function getAvailableGenres(): Genre[] {
  return Object.entries({ ...MOVIE_GENRES, ...TV_GENRES })
    .map(([id, name]) => ({ id: parseInt(id, 10), name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function SearchPage() {
  const popularShows = await fetchPopularShows(50);

  return (
    <main className='min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]'>
      <div className='container mx-auto px-4 py-8'>
        <PageHeader />
        <Suspense>
          <SearchBar />
        </Suspense>
        <div className='mt-12'>
          <Suspense
            fallback={
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6'>
                {Array.from({ length: 18 }).map((_, index) => (
                  <div
                    key={index}
                    className='aspect-[2/3] bg-[#1a1a1a] rounded-lg animate-pulse'
                  />
                ))}
              </div>
            }
          >
            <SearchContent
              initialShows={popularShows}
              availableGenres={getAvailableGenres()}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
