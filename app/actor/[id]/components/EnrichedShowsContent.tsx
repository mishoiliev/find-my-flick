import ShowGrid from '@/components/ShowGrid';
import { enrichActorCreditsWithIMDBRatings, Show } from '@/lib/tmdb';

interface EnrichedShowsContentProps {
  shows: Show[];
  gridLayout?: 'default' | 'compact' | 'search';
}

// Server Component that enriches shows with IMDB ratings
export default async function EnrichedShowsContent({
  shows,
  gridLayout,
}: EnrichedShowsContentProps) {
  const enrichedShows = await enrichActorCreditsWithIMDBRatings(shows);
  return <ShowGrid shows={enrichedShows} gridLayout={gridLayout} />;
}
