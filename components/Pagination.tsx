'use client';

import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  query: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  query,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('q', query);
    if (page > 1) {
      params.set('page', page.toString());
    }
    return `/search?${params.toString()}`;
  };

  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 mt-8 mb-8">
      {/* Previous Button */}
      <Link
        href={createPageUrl(currentPage - 1)}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
          currentPage === 1
            ? 'bg-[#1a1a1a] text-[#FFD700]/30 cursor-not-allowed pointer-events-none border border-[#FFD700]/10'
            : 'bg-[#1a1a1a] text-[#FFD700] hover:bg-[#FFD700] hover:text-[#000000] border border-[#FFD700]/30 hover:border-[#FFD700]'
        }`}
        aria-disabled={currentPage === 1}
      >
        Previous
      </Link>

      {/* Page Numbers */}
      <div className="flex items-center gap-2">
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-[#FFD700]/50"
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <Link
              key={pageNum}
              href={createPageUrl(pageNum)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                isActive
                  ? 'bg-[#FFD700] text-[#000000] border border-[#FFD700]'
                  : 'bg-[#1a1a1a] text-[#FFD700] hover:bg-[#FFD700] hover:text-[#000000] border border-[#FFD700]/30 hover:border-[#FFD700]'
              }`}
            >
              {pageNum}
            </Link>
          );
        })}
      </div>

      {/* Next Button */}
      <Link
        href={createPageUrl(currentPage + 1)}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
          currentPage === totalPages
            ? 'bg-[#1a1a1a] text-[#FFD700]/30 cursor-not-allowed pointer-events-none border border-[#FFD700]/10'
            : 'bg-[#1a1a1a] text-[#FFD700] hover:bg-[#FFD700] hover:text-[#000000] border border-[#FFD700]/30 hover:border-[#FFD700]'
        }`}
        aria-disabled={currentPage === totalPages}
      >
        Next
      </Link>
    </div>
  );
}
