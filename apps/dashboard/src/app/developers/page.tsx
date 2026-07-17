'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/auth';

export default function DevelopersPage() {
  const api = useApi();
  const [rows, setRows] = useState<
    { id: string; displayName: string; email?: string; role: string }[]
  >([]);

  useEffect(() => {
    api('/developers')
      .then(setRows)
      .catch(() => setRows([]));
  }, [api]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Developers</h1>
      <table className="w-full rounded-lg border border-slate-200 bg-white/80 text-left text-sm">
        <thead>
          <tr className="border-b text-xs text-slate-500">
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="p-3">{r.displayName}</td>
              <td className="p-3">{r.email ?? '—'}</td>
              <td className="p-3">{r.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
