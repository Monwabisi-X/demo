import { api } from './client';
import type { NetWorth, Cashflow } from './types';

export const financialApi = {
  netWorth(clientId: string) {
    return api.get<NetWorth>(`/financial/net-worth/${clientId}`);
  },
  assets(clientId: string) {
    return api.get<Array<Record<string, unknown>>>(`/financial/assets/${clientId}`);
  },
  liabilities(clientId: string) {
    return api.get<Array<Record<string, unknown>>>(`/financial/liabilities/${clientId}`);
  },
  addAsset(input: Record<string, unknown>) {
    return api.post(`/financial/assets`, input);
  },
  addLiability(input: Record<string, unknown>) {
    return api.post(`/financial/liabilities`, input);
  },
};

// Cashflow is surfaced by Koisa's dashboard summary; kept here as a typed helper for reuse.
export type { Cashflow };
