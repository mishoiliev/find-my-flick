import BrowseByGenre from '@/components/BrowseByGenre';
import HomeContent from '@/components/HomeContent';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import { fetchPopularMovies, fetchPopularTVShows } from '@/lib/tmdb';
import { Suspense } from 'react';

// The home page is shared by every visitor. Keep it in ISR instead of turning
// every visit into a Function invocation by reading request search params.
export const revalidate = 86400;

export default async function Home() {
  const [popularMovies, popularTVShows] = await Promise.all([
    fetchPopularMovies(),
    fetchPopularTVShows(),
  ]);

  return (
    <main className='min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]'>
      <div className='container mx-auto px-4 py-8'>
        <PageHeader />

        <Suspense
          fallback={
            <div className='w-full max-w-3xl mx-auto h-16 bg-[#1a1a1a] rounded-full animate-pulse' />
          }
        >
          <div className='mb-8'>
            <SearchBar />
          </div>
        </Suspense>

        <Suspense
          fallback={
            <div className='mb-12 h-32 bg-[#1a1a1a] rounded-lg animate-pulse' />
          }
        >
          <BrowseByGenre />
        </Suspense>

        <Suspense>
          <HomeContent
            popularMovies={popularMovies}
            popularTVShows={popularTVShows}
          />
        </Suspense>
      </div>
    </main>
  );
}
