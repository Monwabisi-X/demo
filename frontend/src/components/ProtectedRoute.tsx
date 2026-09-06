import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loading } from '@/components/ui';

/**
 * Guards authenticated routes. Optionally restricts to specific roles; unauthorised users
 * are redirected to login (or a "not authorised" landing when they lack the role).
 */
export function ProtectedRoute({
  children,
  roles,
  loginPath = '/login',
}: {
  children: ReactNode;
  roles?: string[];
  loginPath?: '/login' | '/client-login';
}) {
  const { status, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-cream">
        <Loading label="Restoring your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={loginPath} replace state={{ from }} />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-6 text-center">
        <div>
          <p className="eyebrow">403 — Access restricted</p>
          <h1 className="mt-2 font-serif text-2xl text-ink">You don't have access to this area</h1>
          <p className="mt-2 text-sm text-ink-faint">
            This section requires additional permissions. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
