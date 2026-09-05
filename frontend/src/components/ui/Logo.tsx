import { cn } from '@/lib/cn';

/** Royal Square wordmark: a small maroon square glyph + serif name. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="grid h-8 w-8 place-items-center rounded-md bg-maroon">
        <span className="h-3 w-3 rounded-sm border-2 border-cream-50" />
      </span>
      {!compact && (
        <span className="font-serif text-lg font-semibold tracking-tight text-ink">
          Royal Square
        </span>
      )}
    </span>
  );
}
