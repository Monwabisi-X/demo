import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo, Badge, statusTone, Button } from '@/components/ui';
import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface DashboardTab {
  id: string;
  label: string;
}

/** Tab ids intentionally match Koisa's navigate_to_tab enum so the AI can route here. */
export const DASHBOARD_TABS: DashboardTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'financial_position', label: 'Financial Position' },
  { id: 'policies', label: 'Policies' },
  { id: 'claims', label: 'Claims' },
  { id: 'documents', label: 'Documents' },
  { id: 'profile', label: 'Profile' },
];

export function DashboardShell({
  active,
  onNavigate,
  ficaStatus,
  children,
}: {
  active: string;
  onNavigate: (tab: string) => void;
  ficaStatus?: string;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-cream-300 bg-cream-100 p-5 lg:flex">
          <Link to="/" className="mb-8">
            <Logo />
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {DASHBOARD_TABS.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => onNavigate(t.id)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-maroon text-cream-50'
                      : 'text-ink-soft hover:bg-cream-200 hover:text-ink'
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-lg border border-cream-300 bg-cream-50 p-3 text-xs text-ink-faint">
            Data hosted in af-south-1 · POPIA-aligned
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-cream-300 bg-cream/80 px-6 backdrop-blur">
            {/* Mobile tab selector */}
            <div className="flex items-center gap-3 lg:hidden">
              <Logo compact />
              <select
                value={active}
                onChange={(e) => onNavigate(e.target.value)}
                className="rounded-lg border border-cream-300 bg-cream-50 px-2 py-1 text-sm"
              >
                {DASHBOARD_TABS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="hidden lg:block">
              <p className="eyebrow">Client dashboard</p>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden items-center gap-2 text-sm text-ink-faint sm:flex">
                FICA
                <Badge tone={statusTone(ficaStatus)}>{ficaStatus || 'unknown'}</Badge>
              </span>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-semibold text-cream-50">
                  {initials(user?.display_name)}
                </span>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-ink">{user?.display_name}</p>
                  <p className="text-xs text-ink-faint">{user?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Sign out
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
