export default function ActorHeaderSkeleton() {
  return (
    <div className='flex flex-col md:flex-row gap-8 mb-12'>
      {/* Profile Image Skeleton */}
      <div className='flex-shrink-0'>
        <div className='w-48 md:w-64 aspect-[2/3] rounded-lg bg-[#1a1a1a] animate-pulse border-2 border-[#FFD700]/20' />
      </div>

      {/* Actor Info Skeleton */}
      <div className='flex-1'>
        <div className='h-12 bg-[#1a1a1a] rounded-lg mb-4 animate-pulse w-3/4' />
        <div className='h-6 bg-[#1a1a1a] rounded-lg mb-6 animate-pulse w-1/2' />
        <div className='space-y-3 mb-6'>
          <div className='h-6 bg-[#1a1a1a] rounded-lg animate-pulse w-32' />
          <div className='h-4 bg-[#1a1a1a] rounded-lg animate-pulse' />
          <div className='h-4 bg-[#1a1a1a] rounded-lg animate-pulse w-5/6' />
          <div className='h-4 bg-[#1a1a1a] rounded-lg animate-pulse w-4/6' />
        </div>
      </div>
    </div>
  );
}
