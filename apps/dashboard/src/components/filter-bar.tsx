'use client';

import { useFilters } from '@/lib/filters';

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'sprint', label: 'Sprint' },
] as const;

export function FilterBar() {
  const { filters, setFilters } = useFilters();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white/70 p-3">
      <div className="flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setFilters({ ...filters, range: r.id })}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              filters.range === r.id ? 'bg-accent text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <input
        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
        placeholder="Model filter"
        value={filters.model ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, model: e.target.value || undefined })
        }
      />
      <input
        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
        placeholder="Developer ID"
        value={filters.developerId ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, developerId: e.target.value || undefined })
        }
      />
    </div>
  );
}
