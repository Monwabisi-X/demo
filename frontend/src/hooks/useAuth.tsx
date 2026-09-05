import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/api/auth.api';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '@/api/client';
import type { AppUser } from '@/api/types';

interface AuthState {
  user: AppUser | null;
  roles: string[];
  status: 'loading' | 'authenticated' | 'anonymous';
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAdviser: boolean;
  hasRole: (...codes: string[]) => boolean;
  login: (input: { tenantId: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Roles are embedded in the access token; decode without verifying (server verifies).
function decodeRoles(token: string | null): string[] {
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    roles: decodeRoles(getAccessToken()),
    status: getAccessToken() ? 'loading' : 'anonymous',
  });

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) {
      setState({ user: null, roles: [], status: 'anonymous' });
      return;
    }
    try {
      const user = await authApi.me();
      setState({ user, roles: decodeRoles(getAccessToken()), status: 'authenticated' });
    } catch {
      clearTokens();
      setState({ user: null, roles: [], status: 'anonymous' });
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  // React to a failed token refresh from the axios interceptor.
  useEffect(() => {
    function onExpired() {
      setState({ user: null, roles: [], status: 'anonymous' });
    }
    window.addEventListener('rsf:auth-expired', onExpired);
    return () => window.removeEventListener('rsf:auth-expired', onExpired);
  }, []);

  const login = useCallback<AuthContextValue['login']>(async (input) => {
    const res = await authApi.login(input);
    setTokens(res.accessToken, res.refreshToken);
    setState({ user: res.user, roles: res.roles || decodeRoles(res.accessToken), status: 'authenticated' });
  }, []);

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    const refreshToken = getRefreshToken() || undefined;
    try {
      await authApi.logout(refreshToken);
    } catch {
      /* best effort */
    }
    clearTokens();
    setState({ user: null, roles: [], status: 'anonymous' });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (...codes: string[]) => codes.some((c) => state.roles.includes(c));
    return {
      ...state,
      isAuthenticated: state.status === 'authenticated',
      isAdmin: hasRole('PLATFORM_ADMIN', 'COMPLIANCE_OFFICER'),
      isAdviser: hasRole('ADVISER', 'ADVISER_ASSISTANT', 'PLATFORM_ADMIN'),
      hasRole,
      login,
      logout,
      refreshUser: loadMe,
    };
  }, [state, login, logout, loadMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
