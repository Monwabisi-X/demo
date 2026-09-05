import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

/** localStorage keys for the JWT pair. */
export const TOKEN_KEYS = {
  access: 'rsf.accessToken',
  refresh: 'rsf.refreshToken',
} as const;

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.access);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.refresh);
}
export function setTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEYS.access, accessToken);
  if (refreshToken) localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
}
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
}

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every outgoing request.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The backend wraps success payloads as { data: ... }; unwrap to the inner value.
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

// ── Refresh handling (single-flight) ─────────────────────────────────────────────
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Use a bare axios call so we don't recurse through this interceptor.
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
    const accessToken = unwrap<{ accessToken: string }>(res.data)?.accessToken;
    if (accessToken) {
      setTokens(accessToken);
      return accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Attempt a one-time refresh on 401 for non-auth routes.
    const isAuthRoute = original?.url?.includes('/auth/');
    if (status === 401 && original && !original._retry && !isAuthRoute && getRefreshToken()) {
      original._retry = true;
      refreshInFlight = refreshInFlight ?? performRefresh();
      const newToken = await refreshInFlight;
      refreshInFlight = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
      // Refresh failed: clear session and let the app redirect to login.
      clearTokens();
      window.dispatchEvent(new CustomEvent('rsf:auth-expired'));
    }

    return Promise.reject(error);
  }
);

/** Normalise a backend error into a friendly message + code. */
export interface ApiError {
  message: string;
  code: string;
  details?: Array<{ path?: string; message: string }>;
  status?: number;
}

export function toApiError(err: unknown): ApiError {
  const axiosErr = err as AxiosError<{ error?: ApiError }>;
  const body = axiosErr?.response?.data?.error;
  return {
    message: body?.message || axiosErr?.message || 'Something went wrong',
    code: body?.code || 'UNKNOWN',
    details: body?.details,
    status: axiosErr?.response?.status,
  };
}

/** Thin GET/POST/PUT/DELETE helpers that unwrap the `{ data }` envelope. */
export const api = {
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const res = await apiClient.get(url, { params });
    return unwrap<T>(res.data);
  },
  async post<T>(url: string, body?: unknown): Promise<T> {
    const res = await apiClient.post(url, body);
    return unwrap<T>(res.data);
  },
  async put<T>(url: string, body?: unknown): Promise<T> {
    const res = await apiClient.put(url, body);
    return unwrap<T>(res.data);
  },
  async del<T>(url: string): Promise<T> {
    const res = await apiClient.delete(url);
    return unwrap<T>(res.data);
  },
};
