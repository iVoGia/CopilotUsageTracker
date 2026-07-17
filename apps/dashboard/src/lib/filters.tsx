'use client';

import { createContext, useContext, useMemo, useState } from 'react';

export type Filters = {
  range: 'today' | 'yesterday' | '7d' | '30d' | 'sprint';
  developerId?: string;
  projectId?: string;
  taskId?: string;
  model?: string;
};

type Ctx = {
  filters: Filters;
  setFilters: (f: Filters) => void;
  queryString: string;
};

const FiltersCtx = createContext<Ctx | null>(null);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>({ range: '7d' });
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('range', filters.range);
    if (filters.developerId) params.set('developerId', filters.developerId);
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.taskId) params.set('taskId', filters.taskId);
    if (filters.model) params.set('model', filters.model);
    return params.toString();
  }, [filters]);

  return (
    <FiltersCtx.Provider value={{ filters, setFilters, queryString }}>
      {children}
    </FiltersCtx.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersCtx);
  if (!ctx) throw new Error('FiltersProvider missing');
  return ctx;
}
