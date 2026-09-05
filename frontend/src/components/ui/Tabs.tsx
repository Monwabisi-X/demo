import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1 border-b border-cream-300', className)}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'text-maroon' : 'text-ink-faint hover:text-ink'
            )}
          >
            {t.icon}
            {t.label}
            {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-maroon" />}
          </button>
        );
      })}
    </div>
  );
}
