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
  /** Store a signed consent form / T&Cs and (optionally) record the acceptance. */
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
