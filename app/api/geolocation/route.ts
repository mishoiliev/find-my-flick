import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering since we use request.headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Try to get country from Vercel's geolocation headers first
    const country =
      request.geo?.country || request.headers.get('x-vercel-ip-country');

    if (country) {
      return NextResponse.json({ country: country.toUpperCase() });
    }

    // Fallback: Try to get IP from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
    const ip =
      forwardedFor?.split(',')[0]?.trim() ||
      realIp ||
      cfConnectingIp ||
      request.ip ||
      '';

    console.log('Detected IP:', ip);

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
            console.log('Country from ip-api.com:', data.countryCode);
            return NextResponse.json({
              country: data.countryCode.toUpperCase(),
            });
          }
        }
      } catch (error) {
        console.error('Error fetching country from ip-api.com:', error);
      }

      // Try alternative service: ipapi.co
      try {
        const altResponse = await fetch(
          `https://ipapi.co/${ip}/country_code/`,
          {
            next: { revalidate: 3600 },
          }
        );
        if (altResponse.ok) {
          const countryCode = await altResponse.text();
          if (countryCode && countryCode.trim().length === 2) {
            console.log('Country from ipapi.co:', countryCode.trim());
            return NextResponse.json({
              country: countryCode.trim().toUpperCase(),
            });
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
          console.log('Country from ipapi.co auto-detect:', data.country_code);
          return NextResponse.json({
            country: data.country_code.toUpperCase(),
          });
        }
      }
    } catch (error) {
      console.error('Error with auto-detect geolocation:', error);
    }

    // Final fallback
    return NextResponse.json({ country: 'US' });
  } catch (error) {
    console.error('Error in geolocation endpoint:', error);
    return NextResponse.json({ country: 'US' });
  }
}
