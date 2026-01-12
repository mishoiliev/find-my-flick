export default function AllCreditsSkeleton() {
  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div className='h-9 bg-[#1a1a1a] rounded-lg animate-pulse w-48' />
        <div className='h-10 bg-[#1a1a1a] rounded-lg animate-pulse w-48' />
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6'>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className='aspect-[2/3] bg-[#1a1a1a] rounded-lg animate-pulse'
          />
        ))}
      </div>
    </div>
  );
}
