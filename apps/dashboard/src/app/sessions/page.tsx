'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/auth';

export default function SessionsPage() {
  const api = useApi();
  const [rows, setRows] = useState<
    {
      id: string;
      status: string;
      promptCount: number;
      creditsUsed: number;
      startedAt: string;
      lastActivityAt: string;
      developer: { displayName: string };
    }[]
  >([]);

  useEffect(() => {
    api('/sessions')
      .then(setRows)
      .catch(() => setRows([]));
  }, [api]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Sessions</h1>
      <p className="text-sm text-slate-600">
        Sessions close after 30 minutes of inactivity. Duration and averages come from server aggregates.
      </p>
      <table className="w-full rounded-lg border border-slate-200 bg-white/80 text-left text-sm">
        <thead>
          <tr className="border-b text-xs text-slate-500">
            <th className="p-3">Developer</th>
            <th className="p-3">Status</th>
            <th className="p-3">Prompts</th>
            <th className="p-3">Copilot AI Credits</th>
            <th className="p-3">Started</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="p-3">{r.developer?.displayName}</td>
              <td className="p-3">{r.status}</td>
              <td className="p-3">{r.promptCount}</td>
              <td className="p-3">{r.creditsUsed.toFixed(2)}</td>
              <td className="p-3">{new Date(r.startedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
