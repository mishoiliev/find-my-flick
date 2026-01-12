import CreditsFilter from '@/components/CreditsFilter';
import HypeMeter from '@/components/HypeMeter';
import ShowGrid from '@/components/ShowGrid';
import {
  getActorCredits,
  getActorDetails,
  getProfileUrlLarge,
  sortShowsByComprehensiveScore,
} from '@/lib/tmdb';
import Image from 'next/image';
import { notFound } from 'next/navigation';

interface ActorPageProps {
  params: {
    id: string;
  };
}

export default async function ActorPage({ params }: ActorPageProps) {
  const actorId = parseInt(params.id);

  if (isNaN(actorId)) {
    notFound();
  }

  const [actor, credits] = await Promise.all([
    getActorDetails(actorId),
    getActorCredits(actorId),
  ]);

  if (!actor) {
    notFound();
  }

  const profileUrl = getProfileUrlLarge(actor.profile_path);

  // Sort credits by comprehensive score (hype, reviews, box office) for most popular
  const sortedByScore = sortShowsByComprehensiveScore(credits);

  // Get most popular movies (top 8 for 2x4 grid)
  const mostPopular = sortedByScore.slice(0, 8);

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

  return (
    <div className='min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0a0a0a]'>
      <div className='container mx-auto px-4 py-8'>
        <div className='flex flex-col md:flex-row gap-8 mb-12'>
          {/* Profile Image */}
          <div className='flex-shrink-0'>
            <div className='w-48 md:w-64 aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl border-2 border-[#FFD700]/20'>
              {actor.profile_path ? (
                <Image
                  src={profileUrl}
                  alt={actor.name}
                  fill
                  className='object-cover'
                  sizes='(max-width: 768px) 192px, 256px'
                  priority
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
            <h1 className='text-4xl md:text-5xl font-bold mb-4'>
              {actor.name}
            </h1>

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
              <div className='mb-6'>
                <h2 className='text-2xl font-semibold mb-3 text-[#FFD700]'>
                  Biography
                </h2>
                <p className='text-[#f2f2f1] text-lg leading-relaxed'>
                  {actor.biography.length > 500
                    ? `${actor.biography.substring(0, 500)}...`
                    : actor.biography}
                </p>
              </div>
            )}

            {/* Credits Count */}
            <div className='text-[#f2f2f1]'>
              <p className='text-lg'>
                <span className='text-[#FFD700] font-semibold'>
                  {credits.length}
                </span>{' '}
                {credits.length === 1 ? 'credit' : 'credits'}
              </p>
            </div>
          </div>
        </div>

        {/* Most Popular Movies */}
        {mostPopular.length > 0 && (
          <div className='mb-12'>
            <h2 className='text-3xl font-semibold text-[#FFD700] mb-6'>
              Most Popular
            </h2>
            <ShowGrid shows={mostPopular} gridLayout='compact' />
          </div>
        )}

        {/* All Credits */}
        {credits.length > mostPopular.length && (
          <CreditsFilter credits={credits} />
        )}

        {/* Show message if no credits */}
        {credits.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-[#FFD700]/70 text-lg'>
              No credits found for this actor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
