import { api } from './client';

/**
 * Medical questionnaire API. The raw answers object is sent as-is; the backend encrypts it
 * (KMS envelope) before storage. The frontend never receives or stores plaintext beyond the
 * user's own in-progress form.
 */
export const medicalApi = {
  submit(input: { clientId: string; questionnaireVersion: string; answers: Record<string, unknown> }) {
    return api.post<{ id: string; status: string }>('/medical', input);
  },
  update(questionnaireId: string, input: { answers?: Record<string, unknown>; status?: string }) {
    return api.put<{ id: string; status: string }>(`/medical/${questionnaireId}`, input);
  },
  /** Metadata (+ decrypted answers only for MEDICAL_READ holders on the backend). */
  getForClient(clientId: string) {
    return api.get<{ id: string; status: string; answers?: Record<string, unknown> }>(
      `/medical/${clientId}`
    );
  },
};
