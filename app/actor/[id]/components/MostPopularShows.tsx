import EnrichedShowGrid from './EnrichedShowGrid';
import { Show, sortShowsByComprehensiveScore } from '@/lib/tmdb';

interface MostPopularShowsProps {
  credits: Show[];
}

export default function MostPopularShows({ credits }: MostPopularShowsProps) {
  // Sort credits by comprehensive score (hype, reviews, box office) for most popular
  const sortedByScore = sortShowsByComprehensiveScore(credits);

  // Get most popular movies (top 8 for 2x4 grid)
  const mostPopular = sortedByScore.slice(0, 8);

  if (mostPopular.length === 0) {
    return null;
  }

  return (
    <div className='mb-12'>
      <h2 className='text-3xl font-semibold text-[#FFD700] mb-6'>
        Most Popular
      </h2>
      <EnrichedShowGrid shows={mostPopular} gridLayout='compact' />
    </div>
  );
}
