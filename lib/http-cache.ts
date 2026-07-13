export const CACHE_TTL = {
  search: 6 * 60 * 60,
  catalog: 24 * 60 * 60,
  providers: 7 * 24 * 60 * 60,
} as const;

/**
 * Cache shared, non-personal API responses in the browser briefly and in
 * Vercel's CDN for much longer. The targeted Vercel header makes the origin
 * policy explicit and keeps repeated requests away from Functions.
 */
export function publicCacheHeaders(cdnTtl: number) {
  return {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    'Vercel-CDN-Cache-Control': `public, max-age=${cdnTtl}, stale-while-revalidate=${cdnTtl}, stale-if-error=${cdnTtl}`,
  };
}

export const noStoreHeaders = {
  'Cache-Control': 'no-store',
};
