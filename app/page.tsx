import BrowseByGenre from '@/components/BrowseByGenre';
import SearchBar from '@/components/SearchBar';
import ShowGrid from '@/components/ShowGrid';
import { fetchPopularMovies, fetchPopularTVShows } from '@/lib/tmdb';
import { Suspense } from 'react';

export default async function Home() {
  const [popularMovies, popularTVShows] = await Promise.all([
    fetchPopularMovies(),
    fetchPopularTVShows(),
  ]);

  return (
    <main className='min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]'>
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center mb-12'>
          <h1 className='font-playfair text-6xl md:text-8xl mb-4 bg-gradient-to-r from-[#FFE44D] via-[#FFD700] to-[#FFB300] bg-clip-text text-transparent drop-shadow-2xl transition-all duration-300 hover:scale-105 inline-block tracking-wide font-black pb-5 overflow-visible'>
            Find my Flick
          </h1>
          <p className='text-xl text-[#f2f2f1] font-light tracking-wide'>
            Find where to watch your favorite movies and TV shows
          </p>
        </div>

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
      </div>
    </main>
  );
}
