import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Checkbox styled as a switch, for the medical intake toggles. Uses a native checkbox for
 * accessibility + react-hook-form compatibility (register spreads onto the input).
 */
export interface ToggleProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, className, ...props },
  ref
) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-4', className)}>
      <span className="text-sm text-ink">{label}</span>
      <span className="relative inline-flex shrink-0">
        <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
        <span className="h-6 w-11 rounded-full bg-cream-300 transition-colors peer-checked:bg-maroon" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-cream-50 shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
});
