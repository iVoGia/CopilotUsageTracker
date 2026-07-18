'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { FiltersProvider } from '@/lib/filters';
import { RealtimeProvider } from '@/lib/realtime';
import { FilterBar } from '@/components/filter-bar';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/developers', label: 'Developers' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/statistics', label: 'Statistics' },
  { href: '/credits', label: 'Copilot Credits' },
  { href: '/models', label: 'Models' },
  { href: '/timeline', label: 'Timeline' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FiltersProvider>
        <RealtimeProvider>
          <ShellInner>{children}</ShellInner>
        </RealtimeProvider>
      </FiltersProvider>
    </AuthProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, login, logout, loading } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300/70 pb-4">
        <div>
          <p className="font-display text-3xl tracking-tight text-ink md:text-4xl">
            Copilot Usage Tracker
          </p>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Metadata-only analytics for adoption, cost, and credit optimization — never prompt content.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="rounded bg-white/70 px-2 py-1">{user.displayName} · {user.role}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => login()}
              className="rounded bg-accent px-3 py-1.5 font-medium text-white hover:bg-teal-700"
            >
              {loading ? 'Signing in…' : 'Dev login'}
            </button>
          )}
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                active ? 'bg-ink text-white' : 'bg-white/80 text-slate-700 hover:bg-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <FilterBar />

      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}
