import { api } from './client';

export interface IntegrationSubmission {
  id: string;
  provider: string;
  submission_type: string;
  channel: string;
  status: string;
  provider_reference?: string | null;
  client_id?: string | null;
  created_at: string;
}

export interface ReminderRule {
  id: string;
  reminder_type: string;
  title: string;
  audience: string;
  channel: string;
  cadence_interval: string;
  next_run_at: string;
  active: boolean;
}

/** Staff/admin-only reads for the operations console. */
export const adminApi = {
  integrationSubmissions(params?: { status?: string; clientId?: string }) {
    return api.get<IntegrationSubmission[]>('/integration/submissions', params);
  },
  reminders() {
    return api.get<ReminderRule[]>('/reminders');
  },
  runReminders() {
    return api.post<{ fired: number; rulesProcessed: number }>('/reminders/run');
  },
};
