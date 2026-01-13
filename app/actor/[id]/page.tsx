import { getActorDetails } from '@/lib/tmdb';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ActorCreditsCount from './components/ActorCreditsCount';
import ActorCreditsSection from './components/ActorCreditsSection';
import ActorHeader from './components/ActorHeader';
import AllCreditsSkeleton from './components/AllCreditsSkeleton';
import MostPopularShowsSkeleton from './components/MostPopularShowsSkeleton';

interface ActorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ActorPage({ params }: ActorPageProps) {
  const { id } = await params;
  const actorId = parseInt(id);

  if (isNaN(actorId)) {
    notFound();
  }

  const actor = await getActorDetails(actorId);

  if (!actor) {
    notFound();
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]'>
      <div className='container mx-auto px-4 py-8'>
        {/* Actor Header - loads immediately */}
        <ActorHeader actor={actor} />

        {/* Credits Count - loads separately with Suspense */}
        <Suspense
          fallback={
            <div className='text-[#f2f2f1] mb-12'>
              <div className='h-7 w-32 bg-[#1a1a1a] rounded-lg animate-pulse' />
            </div>
          }
        >
          <ActorCreditsCount actorId={actorId} />
        </Suspense>

        {/* Credits Section - loads separately with Suspense */}
        <Suspense
          fallback={
            <>
              <MostPopularShowsSkeleton />
              <AllCreditsSkeleton />
            </>
          }
        >
          <ActorCreditsSection actorId={actorId} />
        </Suspense>
      </div>
    </div>
  );
}
