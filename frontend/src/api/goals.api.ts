import { api } from './client';
import type { Goal } from './types';

export const goalsApi = {
  listForClient(clientId: string) {
    return api.get<Goal[]>(`/goals/${clientId}`);
  },
  create(input: Record<string, unknown>) {
    return api.post<Goal>('/goals', input);
  },
  update(goalId: string, input: Record<string, unknown>) {
    return api.put<Goal>(`/goals/${goalId}`, input);
  },
  remove(goalId: string) {
    return api.del<{ id: string; deleted: boolean }>(`/goals/${goalId}`);
  },
};
