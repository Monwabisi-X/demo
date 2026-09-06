import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo, Badge, Button } from '@/components/ui';
import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface AdminSection {
  id: string;
  label: string;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { id: 'staging', label: 'Adviser Staging' },
  { id: 'claims', label: 'Claims Board' },
  { id: 'integrations', label: 'Integrations & Reminders' },
  { id: 'audit', label: 'Audit Log' },
];

export function AdminShell({
  active,
  onNavigate,
  children,
}: {
  active: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
}) {
  const { user, roles, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-cream-300 bg-ink p-5 text-cream-50 lg:flex">
          <Link to="/" className="mb-8">
            <Logo />
          </Link>
          <p className="eyebrow mb-3 text-maroon-tint">Admin console</p>
          <nav className="flex flex-1 flex-col gap-1">
            {ADMIN_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id)}
                className={cn(
                  'rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                  s.id === active ? 'bg-maroon text-cream-50' : 'text-cream-300 hover:bg-cream-50/10'
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-lg bg-cream-50/[0.05] p-3 text-xs text-cream-400">
            POPIA-aligned · immutable audit trail
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-cream-300 bg-cream/80 px-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="lg:hidden"><Logo compact /></span>
              <select
                value={active}
                onChange={(e) => onNavigate(e.target.value)}
                className="rounded-lg border border-cream-300 bg-cream-50 px-2 py-1 text-sm lg:hidden"
              >
                {ADMIN_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <p className="eyebrow hidden lg:block">Royal Square · Operations</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden gap-1 sm:flex">
                {roles.slice(0, 2).map((r) => <Badge key={r} tone="maroon">{r}</Badge>)}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-maroon text-sm font-semibold text-cream-50">
                {initials(user?.display_name)}
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()}>Sign out</Button>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
