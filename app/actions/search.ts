'use server';

import { searchShows, sortShowsByPopularity, Show } from '@/lib/tmdb';
import { redirect } from 'next/navigation';

export async function performSearch(formData: FormData) {
  const query = formData.get('query') as string;

  if (!query || !query.trim()) {
    return;
  }

  // Redirect to search page with query params for deep linking
  redirect(`/search?q=${encodeURIComponent(query.trim())}`);
}

export async function searchShowsAction(query: string): Promise<Show[]> {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const data = await searchShows(query.trim(), 1, 100);
    const sortedResults = sortShowsByPopularity(data.results);
    return sortedResults;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}
