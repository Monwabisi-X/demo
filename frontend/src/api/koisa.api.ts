import { api } from './client';
import type { KoisaChatResponse } from './types';

/**
 * Koisa chat. The same endpoint serves public (unauthenticated) and authenticated callers;
 * the backend derives the mode from the JWT and enforces all data-access guardrails.
 */
export const koisaApi = {
  chat(message: string) {
    return api.post<KoisaChatResponse>('/koisa/chat', { message });
  },
};
