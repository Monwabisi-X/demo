import { api } from './client';
import type { AppUser, LoginResponse } from './types';

export const authApi = {
  login(input: { tenantId: string; email: string; password: string }) {
    return api.post<LoginResponse>('/auth/login', input);
  },
  // Client-facing sign-in: email + password only; the tenant is resolved server-side.
  clientLogin(input: { email: string; password: string }) {
    return api.post<LoginResponse>('/auth/client-login', input);
  },
  register(input: {
    tenantId: string;
    email: string;
    displayName: string;
    password: string;
    roleCodes?: string[];
    // Prospective client intake — creates + links a Client record to the new user.
    clientProfile?: {
      clientType?: 'individual' | 'legal_entity';
      title?: string;
      firstName?: string;
      surname?: string;
      idNumber?: string;
      email?: string;
      mobile?: string;
    };
  }) {
    return api.post<AppUser>('/auth/register', input);
  },
  logout(refreshToken?: string) {
    return api.post<{ loggedOut: boolean }>('/auth/logout', { refreshToken });
  },
  me() {
    return api.get<AppUser>('/auth/me');
  },
  updateMe(input: { displayName?: string; email?: string }) {
    return api.put<AppUser>('/auth/me', input);
  },
  changePassword(input: { oldPassword: string; newPassword: string }) {
    return api.post<{ changed: boolean }>('/auth/change-password', input);
  },
  forgotPassword(input: { tenantId: string; email: string }) {
    return api.post<{ requested: boolean }>('/auth/forgot-password', input);
  },
  resetPassword(input: { token: string; newPassword: string }) {
    return api.post<{ reset: boolean }>('/auth/reset-password', input);
  },
  listSessions() {
    return api.get<Array<{ sessionId: string }>>('/auth/sessions');
  },
  revokeSession(sessionId: string) {
    return api.del<{ revoked: boolean }>(`/auth/sessions/${sessionId}`);
  },
};
