import { api } from './client';
import type { ServiceRequest } from './types';

export const serviceRequestsApi = {
  listForClient(clientId: string) {
    return api.get<ServiceRequest[]>(`/service-requests/${clientId}`);
  },
  create(input: { clientId?: string; requestType: string; details?: Record<string, unknown> }) {
    return api.post<ServiceRequest>('/service-requests', input);
  },
  update(requestId: string, input: { status?: string }) {
    return api.put<ServiceRequest>(`/service-requests/${requestId}`, input);
  },
};
