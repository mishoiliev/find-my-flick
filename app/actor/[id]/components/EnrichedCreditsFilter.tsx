'use client';

import {
  Show,
  sortShowsByComprehensiveScore,
  sortShowsByDate,
} from '@/lib/tmdb';
import { useState } from 'react';
import EnrichedShowGrid from './EnrichedShowGrid';

interface EnrichedCreditsFilterProps {
  credits: Show[];
}

type SortOption = 'date' | 'popularity';

export default function EnrichedCreditsFilter({
  credits,
}: EnrichedCreditsFilterProps) {
  const [sortBy, setSortBy] = useState<SortOption>('date');

  const getSortedCredits = (): Show[] => {
    if (sortBy === 'date') {
      return sortShowsByDate(credits);
    } else {
      return sortShowsByComprehensiveScore(credits);
    }
  };

  const sortedCredits = getSortedCredits();

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-3xl font-semibold text-[#FFD700]'>
          All Credits ({credits.length})
        </h2>
        <div className='flex items-center gap-3'>
          <label htmlFor='sort-select' className='text-[#f2f2f1] text-sm'>
            Sort by:
          </label>
          <select
            id='sort-select'
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-[#1a1a1a] border border-[#FFD700]/30 rounded-lg pl-4 pr-10 py-2 text-[#FFD700] focus:outline-none focus:border-[#FFD700]/60 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23FFD700%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right bg-[length:20px]"
            style={{ backgroundPosition: 'right 0.75rem center' }}
          >
            <option value='date'>Date (Newest First)</option>
            <option value='popularity'>Popularity</option>
          </select>
        </div>
      </div>
      <EnrichedShowGrid shows={sortedCredits} />
    </div>
  );
}
