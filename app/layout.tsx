import Navbar from '@/components/Navbar';
import '@/lib/fontawesome';
import { getSiteUrl } from '@/lib/site';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const playfairDisplay = Playfair_Display({
  weight: ['700', '900'],
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'Find my Flick - Find Your Next Show',
    template: '%s | Find my Flick',
  },
  description:
    'Discover where to watch your favorite movies and TV shows. Search through thousands of titles and find the best streaming platforms, rental options, and purchase locations for any movie or TV show.',
  keywords: [
    'movies',
    'TV shows',
    'streaming',
    'where to watch',
    'watch providers',
    'Netflix',
    'Hulu',
    'Disney Plus',
    'Amazon Prime',
    'HBO Max',
    'movie finder',
    'TV show finder',
    'streaming guide',
  ],
  authors: [{ name: 'Find my Flick' }],
  creator: 'Find my Flick',
  publisher: 'Find my Flick',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Find my Flick',
    title: 'Find my Flick - Find Your Next Show',
    description:
      'Discover where to watch your favorite movies and TV shows. Search through thousands of titles and find the best streaming platforms.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Find my Flick - Discover where to watch movies and TV shows',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find my Flick - Find Your Next Show',
    description: 'Discover where to watch your favorite movies and TV shows',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', sizes: '180x180', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.json',
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = getSiteUrl().toString();
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Find my Flick',
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
      },
      {
        '@type': 'WebSite',
        name: 'Find my Flick',
        url: siteUrl,
        description:
          'Discover where to watch your favorite movies and TV shows. Search through thousands of titles and find the best streaming platforms.',
        inLanguage: 'en',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang='en'>
      <body
        className={`${playfairDisplay.variable} ${inter.variable} antialiased`}
      >
        <Navbar />
        {children}
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <Analytics
          beforeSend={(event) => {
            const skip = localStorage.getItem('skipAnalytics') === '1';
            if (skip) return null; // drop the event
            return event;
          }}
          mode='production'
        />
      </body>
    </html>
  );
}
