import EnrichedCreditsFilter from './EnrichedCreditsFilter';
import MostPopularShows from './MostPopularShows';
import { getActorCreditsBasic } from '@/lib/tmdb';

interface ActorCreditsSectionProps {
  actorId: number;
}

export default async function ActorCreditsSection({
  actorId,
}: ActorCreditsSectionProps) {
  // Load basic credits immediately (fast, no IMDB ratings)
  const credits = await getActorCreditsBasic(actorId);

  return (
    <>
      {/* Most Popular Movies */}
      <MostPopularShows credits={credits} />

      {/* All Credits */}
      {credits.length > 0 && <EnrichedCreditsFilter credits={credits} />}

      {/* Show message if no credits */}
      {credits.length === 0 && (
        <div className='text-center py-12'>
          <p className='text-[#FFD700]/70 text-lg'>
            No credits found for this actor.
          </p>
        </div>
      )}
    </>
  );
}
