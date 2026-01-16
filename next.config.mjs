/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
    // Completely disable image optimization to eliminate ALL /_next/image requests
    // TMDB images are already optimized, so we don't need Vercel's optimization
    unoptimized: true,
  },
};

export default nextConfig;
