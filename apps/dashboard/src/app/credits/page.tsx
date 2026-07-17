'use client';

import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApi } from '@/lib/auth';
import { useFilters } from '@/lib/filters';
import { useRealtime } from '@/lib/realtime';

export default function CreditsPage() {
  const api = useApi();
  const { queryString } = useFilters();
  const { eventCount } = useRealtime();
  const [data, setData] = useState<{
    totalCredits: number;
    creditsTrend: { day: string; credits: number }[];
    byModel: { model: string; credits: number }[];
  } | null>(null);

  useEffect(() => {
    api(`/credits?${queryString}`)
      .then(setData)
      .catch(() => setData(null));
  }, [api, queryString, eventCount]);

  if (!data) return <p className="text-sm text-slate-500">Loading credits…</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Credits</h1>
      <p className="font-display text-3xl">{data.totalCredits.toFixed(2)}</p>
      <div className="rounded-lg border border-slate-200 bg-white/80 p-4">
        <h2 className="mb-3 text-sm font-semibold">Credits trend</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.creditsTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="credits" stroke="#0d9488" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1 text-sm">
        {data.byModel.map((m) => (
          <li key={m.model} className="flex justify-between rounded bg-white/80 px-3 py-2">
            <span>{m.model}</span>
            <span>{m.credits.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
