import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stagingApi } from '@/api/staging.api';

/** Pending adviser-staging submissions awaiting QA review. */
export function usePendingStaging() {
  return useQuery({
    queryKey: ['staging', 'pending'],
    queryFn: () => stagingApi.listPending(),
  });
}

/** Approve / reject mutations that invalidate the pending list on success. */
export function useStagingActions() {
  const qc = useQueryClient();

  const approve = useMutation({
    mutationFn: (input: { id: string; targetProvider?: string; adviserEdits?: Record<string, unknown> }) =>
      stagingApi.approve(input.id, { targetProvider: input.targetProvider, adviserEdits: input.adviserEdits }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staging', 'pending'] }),
  });

  const reject = useMutation({
    mutationFn: (input: { id: string; reason: string }) => stagingApi.reject(input.id, input.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staging', 'pending'] }),
  });

  return { approve, reject };
}
