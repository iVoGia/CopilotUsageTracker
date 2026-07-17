'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApi } from '@/lib/auth';
import { useFilters } from '@/lib/filters';
import { useRealtime } from '@/lib/realtime';

export default function ModelsPage() {
  const api = useApi();
  const { queryString } = useFilters();
  const { eventCount } = useRealtime();
  const [models, setModels] = useState<{ model: string; prompts: number; credits: number }[]>([]);

  useEffect(() => {
    api(`/dashboard?${queryString}`)
      .then((d) => setModels(d.topModels ?? []))
      .catch(() => setModels([]));
  }, [api, queryString, eventCount]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Models</h1>
      <div className="rounded-lg border border-slate-200 bg-white/80 p-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={models}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="prompts" fill="#0f172a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
