import { api } from './client';
import type { Policy } from './types';

export const policiesApi = {
  listForClient(clientId: string) {
    return api.get<Policy[]>(`/policies/${clientId}`);
  },
  create(input: Record<string, unknown>) {
    return api.post<Policy>('/policies', input);
  },
  update(policyId: string, input: Record<string, unknown>) {
    return api.put<Policy>(`/policies/${policyId}`, input);
  },
  remove(policyId: string) {
    return api.del<{ id: string; deleted: boolean }>(`/policies/${policyId}`);
  },
};
