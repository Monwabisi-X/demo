import { api } from './client';
import type { DocumentRecord } from './types';

export const documentsApi = {
  listForClient(clientId: string) {
    return api.get<DocumentRecord[]>(`/documents/${clientId}`);
  },
  upload(input: {
    clientId?: string;
    typeCode: string;
    title: string;
    description?: string;
    contentBase64?: string;
    mimeType?: string;
  }) {
    return api.post<DocumentRecord>('/documents/upload', input);
  },
  /** Accept the server-owned current T&Cs during self-service onboarding. */
  acceptTerms(clientId: string) {
    return api.post('/documents/consent/self', { clientId, accepted: true });
  },
  /** Store a signed consent form / T&Cs (staff-only backend operation). */
  storeConsent(input: {
    clientId: string;
    typeCode: 'CONSENT_FORM' | 'TERMS_AND_CONDITIONS' | 'POPIA_DISCLOSURE' | 'MEDICAL_CONSENT';
    title: string;
    contentBase64?: string;
    mimeType?: string;
    consent?: {
      purposeCode: string;
      purposeDescription: string;
      version: string;
      granted?: boolean;
      captureMethod?: 'web_click' | 'upload';
    };
  }) {
    return api.post('/documents/consent', input);
  },
  downloadUrl(documentId: string) {
    return api.get<{ url: string; expiresInSeconds: number; filename: string }>(
      `/documents/${documentId}/download`
    );
  },
  remove(documentId: string) {
    return api.del<{ id: string; deleted: boolean }>(`/documents/${documentId}`);
  },
};
