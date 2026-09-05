import { useQuery } from '@tanstack/react-query';
import { financialApi } from '@/api/financial.api';
import { policiesApi } from '@/api/policies.api';
import { claimsApi } from '@/api/claims.api';
import { documentsApi } from '@/api/documents.api';
import { clientsApi } from '@/api/clients.api';

/**
 * TanStack Query hooks scoped to a single client. The backend enforces RLS, so a client user
 * only ever sees their own data; advisers pass the client id they're viewing.
 */

export function useClient(clientId?: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.get(clientId as string),
    enabled: !!clientId,
  });
}

export function useNetWorth(clientId?: string) {
  return useQuery({
    queryKey: ['netWorth', clientId],
    queryFn: () => financialApi.netWorth(clientId as string),
    enabled: !!clientId,
  });
}

export function useAssets(clientId?: string) {
  return useQuery({
    queryKey: ['assets', clientId],
    queryFn: () => financialApi.assets(clientId as string),
    enabled: !!clientId,
  });
}

export function useLiabilities(clientId?: string) {
  return useQuery({
    queryKey: ['liabilities', clientId],
    queryFn: () => financialApi.liabilities(clientId as string),
    enabled: !!clientId,
  });
}

export function usePolicies(clientId?: string) {
  return useQuery({
    queryKey: ['policies', clientId],
    queryFn: () => policiesApi.listForClient(clientId as string),
    enabled: !!clientId,
  });
}

export function useClaims(clientId?: string) {
  return useQuery({
    queryKey: ['claims', clientId],
    queryFn: () => claimsApi.listForClient(clientId as string),
    enabled: !!clientId,
  });
}

export function useDocuments(clientId?: string) {
  return useQuery({
    queryKey: ['documents', clientId],
    queryFn: () => documentsApi.listForClient(clientId as string),
    enabled: !!clientId,
  });
}
