interface HypeMeterProps {
  popularity: number;
  context?: 'show' | 'actor';
}

export default function HypeMeter({
  popularity,
  context = 'show',
}: HypeMeterProps) {
  // Normalize popularity to 0-100 scale
  // TMDB popularity typically ranges from 0-1000+
  // We'll use a logarithmic scale for better distribution
  // Formula: log10(popularity + 1) / log10(1001) * 100
  const normalizedPopularity = Math.min(
    100,
    Math.max(0, (Math.log10(popularity + 1) / Math.log10(1001)) * 100)
  );

  // Determine hype level and color
  const getHypeLevel = (value: number) => {
    if (value >= 80) return { color: '#FF0000', emoji: '🔥🔥🔥' };
    if (value >= 60) return { color: '#FF6B00', emoji: '🔥🔥' };
    if (value >= 40) return { color: '#FFD700', emoji: '🔥' };
    if (value >= 20) return { color: '#FFE44D', emoji: '⭐' };
    return { color: '#888', emoji: '💤' };
  };

  const hypeInfo = getHypeLevel(normalizedPopularity);

  return (
    <div className='relative flex items-center gap-2 group'>
      <span className='text-sm'>{hypeInfo.emoji}</span>
      <div className='w-20 h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden'>
        <div
          className='h-full rounded-full transition-all duration-500 ease-out'
          style={{
            width: `${normalizedPopularity}%`,
            backgroundColor: hypeInfo.color,
          }}
        />
      </div>
      <span className='text-xs text-[#f2f2f1]/60'>
        {normalizedPopularity.toFixed(0)}%
      </span>

      {/* Tooltip */}
      <div className='absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none'>
        <div className='bg-[#1a1a1a] border border-[#FFD700]/30 rounded-lg p-3 shadow-xl min-w-[240px] max-w-[280px]'>
          <div className='text-xs font-semibold text-[#FFD700] mb-1'>
            Hype Meter
          </div>
          <div className='text-xs text-[#f2f2f1]/90 leading-relaxed'>
            Measures the current popularity and buzz around{' '}
            {context === 'actor' ? 'this actor' : 'this title'}. Higher values
            indicate more trending content.
          </div>
          <div className='text-xs text-[#f2f2f1]/70 mt-2 pt-2 border-t border-[#FFD700]/10'>
            Current: {normalizedPopularity.toFixed(0)}% • Raw:{' '}
            {popularity.toFixed(1)}
          </div>
          {/* Tooltip arrow */}
          <div className='absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#FFD700]/30' />
        </div>
      </div>
    </div>
  );
}
