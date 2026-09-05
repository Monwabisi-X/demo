import { api } from './client';
import type { Claim } from './types';

export const claimsApi = {
  listForClient(clientId: string) {
    return api.get<Claim[]>(`/claims/${clientId}`);
  },
  submit(input: Record<string, unknown>) {
    return api.post<Claim>('/claims', input);
  },
  update(claimId: string, input: Record<string, unknown>) {
    return api.put<Claim>(`/claims/${claimId}`, input);
  },
  status(claimId: string) {
    return api.get<Claim>(`/claims/${claimId}/status`);
  },
};
