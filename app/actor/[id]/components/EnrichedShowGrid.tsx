'use client';

import ShowGrid from '@/components/ShowGrid';
import { Show } from '@/lib/tmdb';
import { Suspense } from 'react';
import EnrichedShowsContent from './EnrichedShowsContent';

interface EnrichedShowGridProps {
  shows: Show[];
  gridLayout?: 'default' | 'compact' | 'search';
}

// Fallback that shows basic shows
function BasicShowsFallback({ shows, gridLayout }: EnrichedShowGridProps) {
  return <ShowGrid shows={shows} gridLayout={gridLayout} />;
}

export default function EnrichedShowGrid({
  shows,
  gridLayout = 'default',
}: EnrichedShowGridProps) {
  return (
    <Suspense
      fallback={<BasicShowsFallback shows={shows} gridLayout={gridLayout} />}
    >
      <EnrichedShowsContent shows={shows} gridLayout={gridLayout} />
    </Suspense>
  );
}
