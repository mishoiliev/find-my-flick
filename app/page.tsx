import BrowseByGenre from '@/components/BrowseByGenre';
import HomeContent from '@/components/HomeContent';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import { fetchPopularMovies, fetchPopularTVShows } from '@/lib/tmdb';
import { Suspense } from 'react';

interface HomeProps {
  searchParams: { genres?: string };
}

export default async function Home({ searchParams }: HomeProps) {
  const [popularMovies, popularTVShows] = await Promise.all([
    fetchPopularMovies(),
    fetchPopularTVShows(),
  ]);

  // Parse selected genres from URL
  const selectedGenreIds = searchParams.genres
    ? searchParams.genres
        .split(',')
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id))
    : [];

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

        <HomeContent
          popularMovies={popularMovies}
          popularTVShows={popularTVShows}
          selectedGenreIds={selectedGenreIds}
        />
      </div>
    </main>
  );
}
