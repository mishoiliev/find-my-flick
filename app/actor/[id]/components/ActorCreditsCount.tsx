import { getActorCreditsBasic } from '@/lib/tmdb';

interface ActorCreditsCountProps {
  actorId: number;
}

export default async function ActorCreditsCount({
  actorId,
}: ActorCreditsCountProps) {
  // Use fast version - we only need the count
  const credits = await getActorCreditsBasic(actorId);

  return (
    <div className='text-[#f2f2f1]'>
      <p className='text-lg'>
        <span className='text-[#FFD700] font-semibold'>{credits.length}</span>{' '}
        {credits.length === 1 ? 'credit' : 'credits'}
      </p>
    </div>
  );
}
