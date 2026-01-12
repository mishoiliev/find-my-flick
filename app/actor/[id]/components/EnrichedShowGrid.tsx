import {
  enrichActorCreditsWithIMDBRatings,
  Show,
} from '@/lib/tmdb';
import { Suspense } from 'react';
import ShowGrid from '@/components/ShowGrid';

interface EnrichedShowGridProps {
  shows: Show[];
  gridLayout?: 'default' | 'compact' | 'search';
}

// Component that enriches shows with IMDB ratings in Suspense
async function EnrichedShowsContent({
  shows,
  gridLayout,
}: EnrichedShowGridProps) {
  const enrichedShows = await enrichActorCreditsWithIMDBRatings(shows);
  return <ShowGrid shows={enrichedShows} gridLayout={gridLayout} />;
}

// Fallback that shows basic shows without IMDB ratings
function BasicShowsFallback({
  shows,
  gridLayout,
}: EnrichedShowGridProps) {
  return <ShowGrid shows={shows} gridLayout={gridLayout} />;
}

export default function EnrichedShowGrid({
  shows,
  gridLayout = 'default',
}: EnrichedShowGridProps) {
  return (
    <Suspense fallback={<BasicShowsFallback shows={shows} gridLayout={gridLayout} />}>
      <EnrichedShowsContent shows={shows} gridLayout={gridLayout} />
    </Suspense>
  );
}
