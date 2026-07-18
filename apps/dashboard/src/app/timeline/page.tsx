'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/auth';
import { useFilters } from '@/lib/filters';
import { useRealtime } from '@/lib/realtime';

export default function TimelinePage() {
  const api = useApi();
  const { queryString } = useFilters();
  const { eventCount } = useRealtime();
  const [daily, setDaily] = useState<{ day: string; prompts: number; credits: number }[]>([]);

  useEffect(() => {
    api(`/dashboard?${queryString}`)
      .then((d) => setDaily(d.dailyUsage ?? []))
      .catch(() => setDaily([]));
  }, [api, queryString, eventCount]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Timeline</h1>
      <p className="text-sm text-slate-600">Session heatmap proxy — daily prompt intensity.</p>
      <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
        {daily.map((d) => {
          const intensity = Math.min(1, d.prompts / 50);
          return (
            <div
              key={d.day}
              title={`${d.day}: ${d.prompts} prompts`}
              className="aspect-square rounded"
              style={{
                backgroundColor: `rgba(13, 148, 136, ${0.15 + intensity * 0.85})`,
              }}
            />
          );
        })}
      </div>
      <ul className="space-y-1 text-sm">
        {daily.map((d) => (
          <li key={d.day} className="flex justify-between rounded bg-white/80 px-3 py-2">
            <span>{d.day}</span>
            <span>
              {d.prompts} prompts · {d.credits.toFixed(2)} Copilot AI Credits
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
