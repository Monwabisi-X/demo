import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-maroon border-t-transparent',
        className
      )}
    />
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-ink-faint">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-cream-400 bg-cream-100 px-6 py-10 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-maroon/20 bg-maroon-tint px-6 py-8 text-center">
      <p className="font-medium text-maroon">Something went wrong</p>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
    </div>
  );
}
