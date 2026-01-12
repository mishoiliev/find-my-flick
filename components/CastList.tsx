import { CastMember, getProfileUrl } from '@/lib/tmdb';
import Image from 'next/image';
import Link from 'next/link';

interface CastListProps {
  cast: CastMember[];
}

export default function CastList({ cast }: CastListProps) {
  if (!cast || cast.length === 0) {
    return (
      <div className="p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-[#FFD700]">Cast</h3>
        <p className="text-[#f2f2f1]">No cast information available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#1a1a1a] border border-[#FFD700]/20 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-[#FFD700]">Cast</h3>
        <span className="text-sm text-[#f2f2f1]/70">
          {cast.length} {cast.length === 1 ? 'actor' : 'actors'}
        </span>
      </div>

      <div className="overflow-x-auto overflow-y-visible pb-4 -mx-2 px-2 custom-scrollbar">
        <div className="flex gap-6 min-w-max">
          {cast.map((actor) => (
            <Link
              key={actor.id}
              href={`/actor/${actor.id}`}
              className="flex flex-col items-center text-center group cursor-pointer flex-shrink-0 w-32"
            >
              <div className="relative w-32 h-32 mb-3 rounded-full overflow-hidden border-2 border-[#FFD700]/20 group-hover:border-[#FFD700]/50 transition-all">
                {actor.profile_path ? (
                  <Image
                    src={getProfileUrl(actor.profile_path)}
                    alt={actor.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
                    <span className="text-[#FFD700]/30 text-3xl">👤</span>
                  </div>
                )}
              </div>
              <div className="w-full">
                <p className="text-base font-semibold text-[#FFD700] truncate group-hover:text-[#FFE44D] transition-colors">
                  {actor.name}
                </p>
                <p className="text-sm text-[#f2f2f1]/70 truncate mt-1.5">
                  {actor.character}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
