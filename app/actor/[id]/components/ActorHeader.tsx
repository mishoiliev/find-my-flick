'use client';

import HypeMeter from '@/components/HypeMeter';
import { Button } from '@/components/ui/button';
import { ActorDetails, getProfileUrlLarge } from '@/lib/tmdb';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface ActorHeaderProps {
  actor: ActorDetails;
}

export default function ActorHeader({ actor }: ActorHeaderProps) {
  const profileUrl = getProfileUrlLarge(actor.profile_path);
  const [isBiographyExpanded, setIsBiographyExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState<string>('200px');
  const [hasMoreContent, setHasMoreContent] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const collapsedHeightRef = useRef<HTMLDivElement>(null);
  const biographyContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);

  // Format birthday
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formattedBirthday = formatDate(actor.birthday);

  // Measure heights and update maxHeight, and check if there's more content
  useEffect(() => {
    const measureHeights = () => {
      if (contentRef.current) {
        const fullHeight = contentRef.current.scrollHeight;
        let collapsedHeight = 0;

        if (collapsedHeightRef.current) {
          collapsedHeight = collapsedHeightRef.current.scrollHeight;
        } else {
          // Fallback: approximate 4 lines
          const lineHeight = parseFloat(
            getComputedStyle(contentRef.current).lineHeight
          );
          collapsedHeight = lineHeight * 4;
        }

        // Check if there's actually more content to show
        // Add a small buffer (10px) to account for measurement differences
        setHasMoreContent(fullHeight > collapsedHeight + 10);

        if (isBiographyExpanded) {
          // Expanded: use full height
          setMaxHeight(`${fullHeight}px`);
        } else {
          // Collapsed: use measured collapsed height
          setMaxHeight(`${collapsedHeight}px`);
        }
      }
    };

    // Measure after render
    const timeoutId = setTimeout(measureHeights, 0);
    measureHeights();

    return () => clearTimeout(timeoutId);
  }, [isBiographyExpanded, actor.biography]);

  const handleToggle = () => {
    const wasExpanded = isBiographyExpanded;
    const willBeExpanded = !isBiographyExpanded;

    // If collapsing, calculate scroll adjustment
    if (wasExpanded && !willBeExpanded && contentRef.current) {
      const fullHeight = contentRef.current.scrollHeight;
      let collapsedHeight = 0;

      if (collapsedHeightRef.current) {
        collapsedHeight = collapsedHeightRef.current.scrollHeight;
      } else {
        const lineHeight = parseFloat(
          getComputedStyle(contentRef.current).lineHeight
        );
        collapsedHeight = lineHeight * 4;
      }

      const heightDifference = fullHeight - collapsedHeight;

      // Get the position of the biography container relative to viewport
      if (biographyContainerRef.current && heightDifference > 0) {
        const containerRect =
          biographyContainerRef.current.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;

        // Check if the container is above the viewport (user has scrolled past it)
        // Only scroll if the container top is above the viewport
        if (containerRect.top < 0) {
          const startScrollY = scrollY;
          const targetScrollY = Math.max(0, scrollY - heightDifference);
          const startTime = performance.now();
          const duration = 500; // Match the CSS transition duration

          const animateScroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use ease-in-out easing to match the CSS transition
            const easeInOut =
              progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const currentScrollY = startScrollY - heightDifference * easeInOut;
            window.scrollTo(0, currentScrollY);

            if (progress < 1) {
              scrollAnimationRef.current = requestAnimationFrame(animateScroll);
            } else {
              scrollAnimationRef.current = null;
            }
          };

          scrollAnimationRef.current = requestAnimationFrame(animateScroll);
        }
      }
    }

    setIsBiographyExpanded(willBeExpanded);
  };

  // Cleanup scroll animation on unmount
  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current !== null) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  return (
    <div className='flex flex-col md:flex-row gap-8 mb-12'>
      {/* Profile Image */}
      <div className='flex-shrink-0'>
        <div className='w-48 md:w-64 aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl border-2 border-[#FFD700]/20'>
          {actor.profile_path && profileUrl ? (
            <Image
              src={profileUrl}
              alt={actor.name}
              fill
              className='object-cover'
              sizes='(max-width: 768px) 192px, 256px'
              priority
              onError={(e) => {
                // Hide broken images to prevent 404s
                const target = e.target as HTMLImageElement;
                if (target.parentElement) {
                  target.parentElement.style.display = 'none';
                }
              }}
            />
          ) : (
            <div className='w-full h-full bg-[#1a1a1a] flex items-center justify-center'>
              <span className='text-[#FFD700]/50 text-4xl'>👤</span>
            </div>
          )}
        </div>
      </div>

      {/* Actor Info */}
      <div className='flex-1 text-[#FFD700]'>
        <h1 className='text-4xl md:text-5xl font-bold mb-4'>{actor.name}</h1>

        <div className='flex items-center gap-4 mb-6 text-[#f2f2f1] flex-wrap'>
          {formattedBirthday && (
            <>
              <span>Born: {formattedBirthday}</span>
              {actor.place_of_birth && <span>•</span>}
            </>
          )}
          {actor.place_of_birth && <span>{actor.place_of_birth}</span>}
          {actor.popularity !== undefined && (
            <>
              <span>•</span>
              <HypeMeter popularity={actor.popularity} context='actor' />
            </>
          )}
        </div>

        {/* Biography */}
        {actor.biography && (
          <div className='mb-6' ref={biographyContainerRef}>
            <h2 className='text-2xl font-semibold mb-3 text-[#FFD700]'>
              Biography
            </h2>
            <div className='text-[#f2f2f1] text-lg leading-relaxed relative'>
              {/* Hidden measurement for collapsed height */}
              <div
                ref={collapsedHeightRef}
                className='text-lg leading-relaxed absolute opacity-0 pointer-events-none'
                style={{
                  visibility: 'hidden',
                  position: 'absolute',
                  top: '-9999px',
                  left: 0,
                  width: '100%',
                }}
              >
                {actor.biography.substring(0, 500)}...
              </div>

              {/* Visible content - always render full biography */}
              <div>
                <span
                  ref={contentRef}
                  className={`block overflow-hidden transition-[max-height] duration-500 ease-in-out relative ${
                    hasMoreContent && !isBiographyExpanded
                      ? 'biography-collapsed'
                      : ''
                  }`}
                  style={{ maxHeight: maxHeight }}
                >
                  {actor.biography}
                </span>
                {hasMoreContent && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleToggle}
                    className='mt-2 text-[#FFD700] hover:text-[#FFE44D] hover:bg-transparent p-0 h-auto font-normal text-lg inline-flex items-baseline transition-colors duration-200'
                  >
                    {isBiographyExpanded ? 'Show less' : 'Show more'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
