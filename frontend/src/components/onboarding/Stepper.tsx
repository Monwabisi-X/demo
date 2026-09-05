import { cn } from '@/lib/cn';

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors',
                done && 'border-maroon bg-maroon text-cream-50',
                active && 'border-maroon bg-maroon-tint text-maroon',
                !done && !active && 'border-cream-400 bg-cream-50 text-ink-faint'
              )}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-sm font-medium sm:block',
                active ? 'text-ink' : 'text-ink-faint'
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('h-px flex-1', done ? 'bg-maroon' : 'bg-cream-300')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
