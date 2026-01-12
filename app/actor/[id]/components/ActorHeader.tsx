import HypeMeter from '@/components/HypeMeter';
import { ActorDetails, getProfileUrlLarge } from '@/lib/tmdb';
import Image from 'next/image';

interface ActorHeaderProps {
  actor: ActorDetails;
}

export default function ActorHeader({ actor }: ActorHeaderProps) {
  const profileUrl = getProfileUrlLarge(actor.profile_path);

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
      </div>
    </div>
  );
}
