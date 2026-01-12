export default function MostPopularShowsSkeleton() {
  return (
    <div className='mb-12'>
      <div className='h-9 bg-[#1a1a1a] rounded-lg mb-6 animate-pulse w-48' />
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className='aspect-[2/3] bg-[#1a1a1a] rounded-lg animate-pulse'
          />
        ))}
      </div>
    </div>
  );
}
