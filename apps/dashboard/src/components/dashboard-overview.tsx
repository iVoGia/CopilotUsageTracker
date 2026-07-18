'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '@/lib/auth';
import { useFilters } from '@/lib/filters';
import { useRealtime } from '@/lib/realtime';

type DashboardData = {
  totals: {
    prompts: number;
    credits: number;
    inputTokens: number;
    outputTokens: number;
    averagePromptLength: number;
    averageResponseLength: number;
    activeDevelopers: number;
    sessions: number;
  };
  topModels: { model: string; prompts: number; credits: number }[];
  topUsers: { displayName: string; prompts: number; credits: number }[];
  dailyUsage: { day: string; prompts: number; credits: number }[];
  creditsTrend: { day: string; credits: number }[];
  aiAdoption: { activeDevelopers: number; prompts: number; promptsPerActiveDev: number };
};

export function DashboardOverview({ title = 'Overview' }: { title?: string }) {
  const api = useApi();
  const { queryString } = useFilters();
  const { eventCount, lastEventAt } = useRealtime();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await api(`/dashboard?${queryString}`);
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, queryString, eventCount]);

  if (error) {
    return (
      <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Sign in to load the dashboard. {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Loading overview…</p>;
  }

  const t = data.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl">{title}</h1>
        <p className="text-xs text-slate-500">
          Live updates: {eventCount}
          {lastEventAt ? ` · last ${new Date(lastEventAt).toLocaleTimeString()}` : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prompts" value={t.prompts} />
        <Stat
          label="Copilot AI Credits"
          value={t.credits.toFixed(2)}
          hint="GitHub Copilot only · 1 credit = $0.01"
        />
        <Stat label="Active developers" value={t.activeDevelopers} />
        <Stat label="Sessions" value={t.sessions} />
        <Stat label="Avg prompt length" value={Math.round(t.averagePromptLength)} />
        <Stat label="Avg response length" value={Math.round(t.averageResponseLength)} />
        <Stat label="Input tokens" value={t.inputTokens} hint="Tokens consumed per prompt (primary cost)" />
        <Stat label="Output tokens" value={t.outputTokens} />
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <strong>Tokens</strong> = cost signal for every prompt (Cursor + Copilot).{' '}
        <strong>Copilot AI Credits</strong> = GitHub Copilot only (official per-token USD rates → credits;
        1 credit = $0.01). Cursor usage shows tokens only (credits = 0).
      </p>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Daily usage">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="prompts" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Copilot AI Credits trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.creditsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="credits" stroke="#0f172a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SimpleTable
          title="Top users"
          columns={['Developer', 'Prompts', 'Copilot AI Credits']}
          rows={data.topUsers.map((u) => [
            u.displayName,
            String(u.prompts),
            u.credits.toFixed(2),
          ])}
        />
        <SimpleTable
          title="Top models"
          columns={['Model', 'Prompts', 'Copilot AI Credits']}
          rows={data.topModels.map((m) => [m.model, String(m.prompts), m.credits.toFixed(2)])}
        />
      </section>

      <p className="text-sm text-slate-600">
        AI adoption: {data.aiAdoption.activeDevelopers} active ·{' '}
        {data.aiAdoption.promptsPerActiveDev.toFixed(1)} prompts / active developer
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-4" title={hint}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-[10px] leading-snug text-slate-400">{hint}</p> : null}
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function SimpleTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            {columns.map((c) => (
              <th key={c} className="py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100">
              {row.map((cell, j) => (
                <td key={j} className="py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
