import {
  WatchProviders as WatchProvidersType,
  getProviderLogoUrl,
} from '@/lib/tmdb';
import Image from 'next/image';

interface WatchProvidersProps {
  providers: WatchProvidersType | null;
  countryCode?: string;
}

export default function WatchProviders({
  providers,
  countryCode = 'US',
}: WatchProvidersProps) {
  if (!providers) {
    return (
      <div className='p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg'>
        <h3 className='text-xl font-semibold mb-4 text-[#FFD700]'>
          Where to Watch
        </h3>
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
        <h3 className='text-xl font-semibold mb-4 text-[#FFD700]'>
          Where to Watch
        </h3>
        <p className='text-[#f2f2f1]'>
          This content is not currently available on any streaming platforms in
          your region.
        </p>
      </div>
    );
  }

  return (
    <div className='p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg'>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-xl font-semibold text-[#FFD700]'>Where to Watch</h3>
        {providers.link && (
          <a
            href={providers.link}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm text-[#FFD700] hover:text-[#FFE44D] transition-colors'
          >
            View More →
          </a>
        )}
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
                  {provider.logo_path && (
                    <Image
                      src={getProviderLogoUrl(provider.logo_path)}
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
                  {provider.logo_path && (
                    <Image
                      src={getProviderLogoUrl(provider.logo_path)}
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
                  {provider.logo_path && (
                    <Image
                      src={getProviderLogoUrl(provider.logo_path)}
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
