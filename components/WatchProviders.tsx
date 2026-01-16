'use client';

import { countries, getCountryName } from '@/lib/countries';
import {
  WatchProviders as WatchProvidersType,
  getProviderLogoUrl,
} from '@/lib/tmdb';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Combobox } from './ui/combobox';

// Convert country code to flag emoji
function getCountryFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface WatchProvidersProps {
  showId: number;
  mediaType: 'movie' | 'tv';
  initialCountryCode?: string;
}

export default function WatchProviders({
  showId,
  mediaType,
  initialCountryCode = 'US',
}: WatchProvidersProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [providers, setProviders] = useState<WatchProvidersType | null>(null);
  const [loading, setLoading] = useState(true);
  const [countryDetected, setCountryDetected] = useState(false);

  // Detect user's country on mount (only once) - this sets the initial country
  useEffect(() => {
    const detectCountry = async () => {
      // Try our API first
      try {
        const response = await fetch('/api/geolocation', {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.country) {
            setSelectedCountry(data.country);
            setCountryDetected(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error detecting country from API:', error);
      }

      // Fallback: Try direct client-side geolocation service
      try {
        const directResponse = await fetch('https://ipapi.co/json/', {
          cache: 'no-store',
        });
        if (directResponse.ok) {
          const data = await directResponse.json();
          if (data.country_code) {
            setSelectedCountry(data.country_code);
            setCountryDetected(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error detecting country from direct service:', error);
      }

      // Final fallback to initialCountryCode
      setSelectedCountry(initialCountryCode);
      setCountryDetected(true);
    };

    detectCountry();
  }, [initialCountryCode]); // Only run once on mount

  useEffect(() => {
    // Only fetch providers once we have a country selected
    if (!selectedCountry) return;

    const fetchProviders = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/tmdb/show/${mediaType}/${showId}/watch-providers?country=${selectedCountry}`
        );
        if (response.ok) {
          const data = await response.json();
          setProviders(data);
        } else {
          setProviders(null);
        }
      } catch (error) {
        console.error('Error fetching watch providers:', error);
        setProviders(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [showId, mediaType, selectedCountry]);

  // Prepare country options for Combobox
  const countryOptions = useMemo(
    () =>
      countries.map((country) => ({
        value: country.code,
        label: `${getCountryFlag(country.code)} ${country.name}`,
      })),
    []
  );

  // Show loading while detecting country or fetching providers
  if (!selectedCountry || loading) {
    return (
      <div className='p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg'>
        <h3 className='text-xl font-semibold mb-4 text-[#FFD700]'>
          Where to Watch
        </h3>
        <p className='text-[#f2f2f1]'>Loading streaming information...</p>
      </div>
    );
  }

  if (!providers) {
    return (
      <div className='p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-xl font-semibold text-[#FFD700]'>
            Where to Watch
          </h3>
          <div className='flex items-center gap-2'>
            <label className='text-sm text-[#f2f2f1] whitespace-nowrap'>
              Country:
            </label>
            <Combobox
              options={countryOptions}
              value={selectedCountry || ''}
              onValueChange={setSelectedCountry}
              placeholder='Select country...'
              searchPlaceholder='Search countries...'
              className='min-w-[200px]'
            />
          </div>
        </div>
        <p className='text-[#f2f2f1]'>
          No streaming information available for this content.
        </p>
      </div>
    );
  }

  const hasAnyProviders =
    (providers.flatrate && providers.flatrate.length > 0) ||
    (providers.rent && providers.rent.length > 0) ||
    (providers.buy && providers.buy.length > 0);

  if (!hasAnyProviders) {
    return (
      <div className='p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-xl font-semibold text-[#FFD700]'>
            Where to Watch
          </h3>
          <div className='flex items-center gap-2'>
            <label className='text-sm text-[#f2f2f1] whitespace-nowrap'>
              Country:
            </label>
            <Combobox
              options={countryOptions}
              value={selectedCountry || ''}
              onValueChange={setSelectedCountry}
              placeholder='Select country...'
              searchPlaceholder='Search countries...'
              className='min-w-[200px]'
            />
          </div>
        </div>
        <p className='text-[#f2f2f1]'>
          This content is not currently available on any streaming platforms in{' '}
          {getCountryName(selectedCountry)}.
        </p>
      </div>
    );
  }

  return (
    <div className='p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg'>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-xl font-semibold text-[#FFD700]'>Where to Watch</h3>
        <div className='flex items-center gap-2'>
          <label className='text-sm text-[#f2f2f1] whitespace-nowrap'>
            Country:
          </label>
          <Combobox
            options={countryOptions}
            value={selectedCountry || ''}
            onValueChange={setSelectedCountry}
            placeholder='Select country...'
            searchPlaceholder='Search countries...'
            className='min-w-[200px]'
          />
        </div>
      </div>

      <div className='space-y-6'>
        {/* Streaming (Subscription) */}
        {providers.flatrate && providers.flatrate.length > 0 && (
          <div>
            <h4 className='text-lg font-medium text-[#FFD700]/90 mb-3 flex items-center gap-2'>
              <span className='text-[#FFD700]'>▶</span> Stream
            </h4>
            <div className='flex flex-wrap gap-3'>
              {providers.flatrate.map((provider) => (
                <div
                  key={provider.provider_id}
                  className='flex items-center gap-2 bg-[#0a0a0a] px-4 py-2 rounded-lg border border-[#FFD700]/20 hover:border-[#FFD700]/50 hover:bg-[#1a1a1a] transition-all'
                >
                  {provider.logo_path &&
                    getProviderLogoUrl(provider.logo_path) && (
                      <Image
                        src={getProviderLogoUrl(provider.logo_path)!}
                        alt={provider.provider_name}
                        width={45}
                        height={45}
                        className='rounded'
                        onError={(e) => {
                          // Hide broken images to prevent 404s
                          const target = e.target as HTMLImageElement;
                          if (target.parentElement) {
                            target.parentElement.style.display = 'none';
                          }
                        }}
                      />
                    )}
                  <span className='text-[#FFD700] font-medium text-sm'>
                    {provider.provider_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rent */}
        {providers.rent && providers.rent.length > 0 && (
          <div>
            <h4 className='text-lg font-medium text-[#FFD700]/90 mb-3 flex items-center gap-2'>
              <span className='text-[#FFD700]'>💰</span> Rent
            </h4>
            <div className='flex flex-wrap gap-3'>
              {providers.rent.map((provider) => (
                <div
                  key={provider.provider_id}
                  className='flex items-center gap-2 bg-[#0a0a0a] px-4 py-2 rounded-lg border border-[#FFD700]/20 hover:border-[#FFD700]/50 hover:bg-[#1a1a1a] transition-all'
                >
                  {provider.logo_path &&
                    getProviderLogoUrl(provider.logo_path) && (
                      <Image
                        src={getProviderLogoUrl(provider.logo_path)!}
                        alt={provider.provider_name}
                        width={45}
                        height={45}
                        className='rounded'
                        onError={(e) => {
                          // Hide broken images to prevent 404s
                          const target = e.target as HTMLImageElement;
                          if (target.parentElement) {
                            target.parentElement.style.display = 'none';
                          }
                        }}
                      />
                    )}
                  <span className='text-[#FFD700] font-medium text-sm'>
                    {provider.provider_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buy */}
        {providers.buy && providers.buy.length > 0 && (
          <div>
            <h4 className='text-lg font-medium text-[#FFD700]/90 mb-3 flex items-center gap-2'>
              <span className='text-[#FFD700]'>💳</span> Buy
            </h4>
            <div className='flex flex-wrap gap-3'>
              {providers.buy.map((provider) => (
                <div
                  key={provider.provider_id}
                  className='flex items-center gap-2 bg-[#0a0a0a] px-4 py-2 rounded-lg border border-[#FFD700]/20 hover:border-[#FFD700]/50 hover:bg-[#1a1a1a] transition-all'
                >
                  {provider.logo_path &&
                    getProviderLogoUrl(provider.logo_path) && (
                      <Image
                        src={getProviderLogoUrl(provider.logo_path)!}
                        alt={provider.provider_name}
                        width={45}
                        height={45}
                        className='rounded'
                        onError={(e) => {
                          // Hide broken images to prevent 404s
                          const target = e.target as HTMLImageElement;
                          if (target.parentElement) {
                            target.parentElement.style.display = 'none';
                          }
                        }}
                      />
                    )}
                  <span className='text-[#FFD700] font-medium text-sm'>
                    {provider.provider_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {providers.link && (
        <div className='flex justify-end mt-6'>
          <a
            href={providers.link}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-[#FFD700] hover:text-[#FFE44D] transition-colors'
          >
            View More →
          </a>
        </div>
      )}
    </div>
  );
}
