'use client';

import { useRouter } from 'next/navigation';

export default function PageHeader() {
  const router = useRouter();

  const handleTitleClick = () => {
    router.push('/');
  };

  return (
    <div className='text-center mb-12'>
      <h1
        onClick={handleTitleClick}
        className='font-playfair text-6xl md:text-8xl mb-4 bg-gradient-to-r from-[#FFE44D] via-[#FFD700] to-[#FFB300] bg-clip-text text-transparent drop-shadow-2xl transition-all duration-300 hover:scale-105 inline-block tracking-wide font-black pb-5 overflow-visible cursor-pointer'
      >
        Find my Flick
      </h1>
      <p className='text-xl text-[#f2f2f1] font-light tracking-wide'>
        Find where to watch your favorite movies and TV shows
      </p>
    </div>
  );
}
