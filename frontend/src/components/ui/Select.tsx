import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, className, id, ...props },
  ref
) {
  const fieldId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink-soft">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        className={cn(
          'w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-ink',
          'transition-colors focus:border-maroon focus:bg-white',
          error && 'border-maroon',
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-medium text-maroon">{error}</p>}
    </div>
  );
});
