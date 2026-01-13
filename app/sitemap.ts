import { getSiteUrl } from '@/lib/site';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl().toString();

  return [
    {
      url: siteUrl,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/search`,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];
}
