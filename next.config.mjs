/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
    // Use custom loader to leverage TMDB's native size variants
    // This eliminates Vercel image optimization costs entirely
    loader: 'custom',
    loaderFile: './lib/tmdb-image-loader.ts',
    // Keep these for fallback if loader fails
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
