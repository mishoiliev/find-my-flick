'use client';

import { Analytics } from '@vercel/analytics/next';

export default function AnalyticsWrapper() {
  return (
    <Analytics
      beforeSend={(event) => {
        const skip = localStorage.getItem('skipAnalytics') === '1';
        if (skip) return null; // drop the event
        return event;
      }}
      mode='production'
    />
  );
}
