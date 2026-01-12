'use client';

import { Show } from '@/lib/tmdb';
import ShowCard from './ShowCard';

interface ShowGridProps {
  shows: Show[];
  gridLayout?: 'default' | 'compact' | 'search';
}

export default function ShowGrid({
  shows,
  gridLayout = 'default',
}: ShowGridProps) {
  if (shows.length === 0) {
    return (
      <div className='text-center py-12'>
        <p className='text-[#FFD700]/70 text-lg'>No shows found</p>
      </div>
    );
  }

  // Default layout: responsive grid for homepage and credits
  // Compact layout: 2x4 grid for "Most Popular" sections
  // Search layout: 6 rows with items expanding to fill width, responsive columns
  let gridClasses: string;
  if (gridLayout === 'compact') {
    gridClasses = 'grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6';
  } else if (gridLayout === 'search') {
    // 6 rows, responsive columns that expand to fill width
    // Always shows 36 items (6x6 on xl screens, adjusts on smaller screens)
    // Items will expand to fill available width in each row
    gridClasses =
      'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6';
  } else {
    gridClasses =
      'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6';
  }

  return (
    <div className={gridClasses}>
      {shows.map((show) => {
        const mediaType = show.media_type || 'movie';
        return (
          <ShowCard
            key={`${mediaType}-${show.id}`}
            show={show}
            gridLayout={gridLayout}
          />
        );
      })}
    </div>
  );
}
