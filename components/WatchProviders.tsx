'use client';

import { countries, getCountryName } from '@/lib/countries';
import {
  getProviderLogoUrl,
  WatchProviders as WatchProvidersType,
} from '@/lib/tmdb';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Combobox } from './ui/combobox';

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
  initialCountryCode: string;
  initialProviders: WatchProvidersType | null;
}

export default function WatchProviders({
  showId,
  mediaType,
  initialCountryCode,
  initialProviders,
}: WatchProvidersProps) {
  const [selectedCountry, setSelectedCountry] = useState(initialCountryCode);
  const [providers, setProviders] =
    useState<WatchProvidersType | null>(initialProviders);
  const [loadedCountry, setLoadedCountry] = useState(initialCountryCode);

  useEffect(() => {
    if (selectedCountry === initialCountryCode) return;

    const controller = new AbortController();
    fetch(
      `/api/tmdb/show/${mediaType}/${showId}/watch-providers?country=${selectedCountry}`,
      { cache: 'default', signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return (await response.json()) as WatchProvidersType | null;
      })
      .then((result) => {
        setProviders(result);
        setLoadedCountry(selectedCountry);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error fetching watch providers:', error);
        setProviders(null);
        setLoadedCountry(selectedCountry);
      });

    return () => controller.abort();
  }, [
    initialCountryCode,
    initialProviders,
    mediaType,
    selectedCountry,
    showId,
  ]);

  const countryOptions = useMemo(
    () =>
      countries.map((country) => ({
        value: country.code,
        label: `${getCountryFlag(country.code)} ${country.name}`,
      })),
    []
  );

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };

  const displayedProviders =
    selectedCountry === initialCountryCode ? initialProviders : providers;
  const isLoading =
    selectedCountry !== initialCountryCode && loadedCountry !== selectedCountry;

  const countryPicker = (
    <div className='flex items-center gap-2'>
      <label className='text-sm text-[#f2f2f1] whitespace-nowrap'>
        Country:
      </label>
      <Combobox
        options={countryOptions}
        value={selectedCountry}
        onValueChange={handleCountryChange}
        placeholder='Select country...'
        searchPlaceholder='Search countries...'
        className='min-w-[200px]'
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className='p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg'>
        <h3 className='text-xl font-semibold mb-4 text-[#FFD700]'>
          Where to Watch
        </h3>
        <p className='text-[#f2f2f1]'>Loading streaming information...</p>
      </div>
    );
  }

  const providerGroups = [
    {
      key: 'flatrate',
      label: 'Stream',
      icon: '▶',
      items: displayedProviders?.flatrate,
    },
    { key: 'rent', label: 'Rent', icon: '💰', items: displayedProviders?.rent },
    { key: 'buy', label: 'Buy', icon: '💳', items: displayedProviders?.buy },
  ] as const;
  const hasAnyProviders = providerGroups.some(
    (group) => group.items && group.items.length > 0
  );

  return (
    <div className='p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg'>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-xl font-semibold text-[#FFD700]'>Where to Watch</h3>
        {countryPicker}
      </div>

      {!hasAnyProviders ? (
        <p className='text-[#f2f2f1]'>
          No streaming information is currently available in{' '}
          {getCountryName(selectedCountry)}.
        </p>
      ) : (
        <div className='space-y-6'>
          {providerGroups.map(
            (group) =>
              group.items &&
              group.items.length > 0 && (
                <div key={group.key}>
                  <h4 className='text-lg font-medium text-[#FFD700]/90 mb-3 flex items-center gap-2'>
                    <span className='text-[#FFD700]'>{group.icon}</span>{' '}
                    {group.label}
                  </h4>
                  <div className='flex flex-wrap gap-3'>
                    {group.items.map((provider) => {
                      const logoUrl = getProviderLogoUrl(provider.logo_path);
                      return (
                        <div
                          key={provider.provider_id}
                          className='flex items-center gap-2 bg-[#0a0a0a] px-4 py-2 rounded-lg border border-[#FFD700]/20 hover:border-[#FFD700]/50 hover:bg-[#1a1a1a] transition-all'
                        >
                          {logoUrl && (
                            <Image
                              src={logoUrl}
                              alt={provider.provider_name}
                              width={45}
                              height={45}
                              className='rounded'
                            />
                          )}
                          <span className='text-[#FFD700] font-medium text-sm'>
                            {provider.provider_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
          )}
        </div>
      )}

      {displayedProviders?.link && (
        <div className='flex justify-end mt-6'>
          <a
            href={displayedProviders.link}
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
