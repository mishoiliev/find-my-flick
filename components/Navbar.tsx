'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show navbar when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsVisible(true);
      }
      // Hide navbar when scrolling down
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Don't show navbar on home page
  if (pathname === '/') {
    return null;
  }

  return (
    <nav
      className={`w-full border-b border-[#FFD700]/20 bg-[#0f0f0f]/80 backdrop-blur-sm sticky top-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className='container mx-auto px-4 py-4'>
        <Link
          href='/'
          className='flex items-center gap-3 font-playfair text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#FFE44D] via-[#FFD700] to-[#FFB300] bg-clip-text text-transparent hover:opacity-80 transition-opacity'
        >
          <Image
            src='/icon.svg'
            alt='Find my Flick icon'
            width={32}
            height={32}
            className='flex-shrink-0'
          />
          Find my Flick
        </Link>
      </div>
    </nav>
  );
}
