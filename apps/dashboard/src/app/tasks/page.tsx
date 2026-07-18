'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/auth';

export default function TasksPage() {
  const api = useApi();
  const [rows, setRows] = useState<
    {
      id: string;
      name: string;
      jiraId?: string;
      promptCount: number;
      credits: number;
      active: boolean;
      developer: { displayName: string };
    }[]
  >([]);

  useEffect(() => {
    api('/tasks/costs')
      .then(setRows)
      .catch(() => setRows([]));
  }, [api]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Tasks · Cost</h1>
      <table className="w-full rounded-lg border border-slate-200 bg-white/80 text-left text-sm">
        <thead>
          <tr className="border-b text-xs text-slate-500">
            <th className="p-3">Task</th>
            <th className="p-3">Jira</th>
            <th className="p-3">Developer</th>
            <th className="p-3">Prompts</th>
            <th className="p-3">Copilot AI Credits</th>
            <th className="p-3">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="p-3">{r.name}</td>
              <td className="p-3">{r.jiraId ?? '—'}</td>
              <td className="p-3">{r.developer?.displayName}</td>
              <td className="p-3">{r.promptCount}</td>
              <td className="p-3">{r.credits.toFixed(2)}</td>
              <td className="p-3">{r.active ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
