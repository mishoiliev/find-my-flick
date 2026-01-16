/**
 * Custom image loader for TMDB images
 * Uses TMDB's native size variants to avoid Vercel image optimization costs
 *
 * TMDB provides pre-sized images: w92, w154, w185, w342, w500, w780, w1280, original
 * This loader maps Next.js requested widths to the closest TMDB size
 *
 * This eliminates ALL Vercel image optimization costs since we use TMDB's CDN directly
 */
export default function tmdbImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // Handle placeholder images (not from TMDB)
  if (src.startsWith('/placeholder-') || !src.startsWith('/')) {
    return src;
  }

  // Extract the path - remove any existing TMDB size prefixes
  let imagePath = src;

  // If src is a full TMDB URL, extract just the path
  if (src.startsWith('https://image.tmdb.org')) {
    const url = new URL(src);
    imagePath = url.pathname;
    // Remove the size prefix (e.g., "/t/p/w500" -> "")
    imagePath = imagePath.replace(/^\/t\/p\/w\d+/, '');
  } else if (src.startsWith('/t/p/')) {
    // Handle paths like "/t/p/w500/path.jpg"
    imagePath = src.replace(/^\/t\/p\/w\d+/, '');
  }

  // Ensure path starts with /
  if (!imagePath.startsWith('/')) {
    imagePath = `/${imagePath}`;
  }

  // Map requested width to closest TMDB size variant
  // TMDB sizes: w92, w154, w185, w342, w500, w780, w1280, original
  let tmdbSize = 'w500'; // default

  if (width <= 92) {
    tmdbSize = 'w92';
  } else if (width <= 154) {
    tmdbSize = 'w154';
  } else if (width <= 185) {
    tmdbSize = 'w185';
  } else if (width <= 342) {
    tmdbSize = 'w342';
  } else if (width <= 500) {
    tmdbSize = 'w500';
  } else if (width <= 780) {
    tmdbSize = 'w780';
  } else if (width <= 1280) {
    tmdbSize = 'w1280';
  } else {
    tmdbSize = 'original';
  }

  // Construct TMDB URL with the appropriate size
  return `https://image.tmdb.org/t/p/${tmdbSize}${imagePath}`;
}
