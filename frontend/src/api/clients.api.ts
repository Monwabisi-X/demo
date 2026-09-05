import { api } from './client';
import type { Client } from './types';

export const clientsApi = {
  list(params?: { limit?: number; offset?: number }) {
    return api.get<{ items: Client[]; total: number }>('/clients', params);
  },
  get(clientId: string) {
    return api.get<Client>(`/clients/${clientId}`);
  },
  create(input: Record<string, unknown>) {
    return api.post<Client>('/clients', input);
  },
  update(clientId: string, input: Record<string, unknown>) {
    return api.put<Client>(`/clients/${clientId}`, input);
  },
  remove(clientId: string) {
    return api.del<{ id: string; deleted: boolean }>(`/clients/${clientId}`);
  },
};
