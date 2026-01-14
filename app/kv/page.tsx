import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function KvPage() {
  if (process.env.NODE_ENV === 'production') {
    return notFound();
  }

  return (
    <div className='min-h-screen bg-[#0f0f0f] text-[#f2f2f1] p-8'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold text-[#FFD700] mb-4'>KV Cache</h1>
        <p className='text-[#f2f2f1]/80'>
          IMDB caching has been removed to reduce costs. This page is no longer
          needed.
        </p>
      </div>
    </div>
  );
}
