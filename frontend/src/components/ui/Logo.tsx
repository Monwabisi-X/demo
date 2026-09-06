import { cn } from '@/lib/cn';

/**
 * Royal Square Financial brand mark. Renders the real logo asset (public/logo.jpg — the
 * black/maroon emblem + wordmark). Wrapped in a small white chip so it stays legible on the
 * dark (ink/maroon) surfaces used on the login and admin screens, since the source image has
 * a white background.
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <span className="inline-flex items-center rounded-md bg-white px-2 py-1 shadow-sm">
        <img
          src="/logo.jpg"
          alt="Royal Square Financial"
          className={compact ? 'h-6 w-auto' : 'h-9 w-auto'}
        />
      </span>
    </span>
  );
}
