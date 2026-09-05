import { api } from './client';
import type { StagingSubmission } from './types';

/**
 * Adviser QA staging gate. The backend exposes this workflow under /workflow/approval/*.
 * Submissions are keyed by entityType 'adviser_staging' and the submission id.
 */
const ENTITY = 'adviser_staging';

export const stagingApi = {
  /** Submit a raw client snapshot into the staging queue for adviser review. */
  submit(input: { clientId?: string; submissionType: string; snapshot: Record<string, unknown> }) {
    return api.post<StagingSubmission>('/workflow/approval/submit', input);
  },

  /** List submissions awaiting review. */
  listPending() {
    return api.get<StagingSubmission[]>('/workflow/approval/pending');
  },

  getStatus(id: string) {
    return api.get<StagingSubmission>(`/workflow/approval/${ENTITY}/${id}/status`);
  },

  /** Approve — enriches with adviser edits + target provider, then queues dispatch. */
  approve(id: string, input: { targetProvider?: string; adviserEdits?: Record<string, unknown> }) {
    return api.put<StagingSubmission>(`/workflow/approval/${ENTITY}/${id}/approve`, {
      adviserEdits: {
        ...(input.adviserEdits || {}),
        target_provider: input.targetProvider,
      },
    });
  },

  reject(id: string, reason: string) {
    return api.put<StagingSubmission>(`/workflow/approval/${ENTITY}/${id}/reject`, { reason });
  },
};
