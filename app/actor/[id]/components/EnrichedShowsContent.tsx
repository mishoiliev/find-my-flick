import ShowGrid from '@/components/ShowGrid';
import { Show } from '@/lib/tmdb';

interface EnrichedShowsContentProps {
  shows: Show[];
  gridLayout?: 'default' | 'compact' | 'search';
}

// Component that displays shows
export default function EnrichedShowsContent({
  shows,
  gridLayout,
}: EnrichedShowsContentProps) {
  return <ShowGrid shows={shows} gridLayout={gridLayout} />;
}
