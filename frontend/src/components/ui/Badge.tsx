import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'maroon' | 'success' | 'warning' | 'ink';

const tones: Record<Tone, string> = {
  neutral: 'bg-cream-200 text-ink-soft border-cream-300',
  maroon: 'bg-maroon-tint text-maroon border-maroon/20',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  ink: 'bg-ink text-cream-50 border-ink',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Maps a status string to a sensible tone (FICA / policy / claim statuses). */
export function statusTone(status: string | null | undefined): Tone {
  const s = (status || '').toLowerCase();
  if (['verified', 'active', 'approved', 'completed', 'closed'].includes(s)) return 'success';
  if (['pending', 'in_progress', 'in_review', 'pending_review', 'submitted'].includes(s)) return 'warning';
  if (['rejected', 'failed', 'cancelled', 'inactive'].includes(s)) return 'maroon';
  return 'neutral';
}
