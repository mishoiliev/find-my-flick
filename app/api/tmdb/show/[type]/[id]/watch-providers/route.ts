import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function detectCountryCode(request: NextRequest): Promise<string> {
  // Try to get country from Vercel's geolocation headers first
  const country = request.headers.get('x-vercel-ip-country');

  if (country) {
    return country.toUpperCase();
  }

  // Fallback: Try to get IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  const ip =
    forwardedFor?.split(',')[0]?.trim() || realIp || cfConnectingIp || '';

  // If we have a valid IP (not localhost), use IP-based geolocation
  if (ip && ip !== '::1' && ip !== '127.0.0.1' && ip !== '') {
    // Use a free IP geolocation service
    // Try ip-api.com first (free tier: 45 requests/minute)
    try {
      const response = await fetch(
        `https://ip-api.com/json/${ip}?fields=countryCode`,
        {
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.countryCode) {
          return data.countryCode.toUpperCase();
        }
      }
    } catch (error) {
      console.error('Error fetching country from ip-api.com:', error);
    }

    // Try alternative service: ipapi.co
    try {
      const altResponse = await fetch(`https://ipapi.co/${ip}/country_code/`, {
        next: { revalidate: 3600 },
      });
      if (altResponse.ok) {
        const countryCode = await altResponse.text();
        if (countryCode && countryCode.trim().length === 2) {
          return countryCode.trim().toUpperCase();
        }
      }
    } catch (altError) {
      console.error('Error fetching country from ipapi.co:', altError);
    }
  }

  // If no IP detected or localhost, try a service that auto-detects from the request
  // This works when the service can see the client's IP from the request
  try {
    const autoDetectResponse = await fetch('https://ipapi.co/json/', {
      next: { revalidate: 3600 },
    });
    if (autoDetectResponse.ok) {
      const data = await autoDetectResponse.json();
      if (data.country_code) {
        return data.country_code.toUpperCase();
      }
    }
  } catch (error) {
    console.error('Error with auto-detect geolocation:', error);
  }

  // Final fallback
  return 'US';
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ type: string; id: string }>;
  }
) {
  const { type, id } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Use country from query param if provided, otherwise detect from user's IP
  const countryCode =
    searchParams.get('country') || (await detectCountryCode(request));

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json(
      { error: 'Invalid type. Must be "movie" or "tv"' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}/watch/providers?api_key=${TMDB_API_KEY}`,
      {
        next: { revalidate: 86400 },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch watch providers');
    }

    const data = await response.json();
    const providers = data.results[countryCode] || null;

    return NextResponse.json(providers);
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watch providers' },
      { status: 500 }
    );
  }
}
