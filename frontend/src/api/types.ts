/** Shared API types, mirroring the backend's response shapes (non-sensitive fields only). */

export interface AppUser {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  status: string;
  client_id?: string | null;
  mfa_enabled?: boolean;
  last_login_at?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AppUser;
  roles: string[];
}

export interface Client {
  id: string;
  tenant_id: string;
  client_type: string;
  title?: string | null;
  first_name?: string | null;
  surname?: string | null;
  legal_entity_name?: string | null;
  fica_status: string;
  net_worth?: string | null;
  status: string;
  created_at?: string;
}

export interface NetWorth {
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
  currency_code: string;
}

export interface Cashflow {
  total_monthly_income: string;
  total_monthly_expenses: string;
  monthly_surplus: string;
  currency_code: string;
}

export interface Policy {
  id: string;
  provider?: string | null;
  product?: string | null;
  status: string;
  policy_number_masked?: string | null;
  premium?: string | null;
  cover_amount?: string | null;
  current_value?: string | null;
  currency_code?: string;
  renewal_date?: string | null;
}

export interface Claim {
  id: string;
  claim_number_masked?: string | null;
  claim_type: string;
  status: string;
  reported_at: string;
  loss_date?: string | null;
  narrative?: string | null;
  closed_at?: string | null;
}

export interface DocumentRecord {
  id: string;
  title: string;
  document_type_id: string;
  classification: string;
  upload_status: string;
  review_status: string;
  created_at: string;
  DocumentType?: { code: string; name: string; is_consent_artifact: boolean };
}

export interface StagingSubmission {
  id: string;
  tenant_id: string;
  client_id?: string | null;
  submission_type: string;
  client_snapshot: Record<string, unknown>;
  adviser_edits: Record<string, unknown>;
  status: string;
  reviewed_at?: string | null;
  dispatched_at?: string | null;
  created_at: string;
}

export interface LearningArticle {
  id: string;
  category: 'CLAIM_GUIDE' | 'INVESTMENT' | 'TRAINING' | 'GUIDE' | string;
  topic?: string | null;
  slug: string;
  title: string;
  summary?: string | null;
  body: string;
  steps: string[];
  read_minutes: number;
  sort_order?: number;
  published?: boolean;
  updated_at?: string;
}

export interface KoisaChatResponse {
  mode: 'public' | 'authenticated';
  warning?: string | null;
  reply: string;
  availableTools?: string[];
  toolResults?: Array<{ tool: string; result: unknown }>;
  // Some deployments return a structured navigation directive:
  tool_call?: { name: string; args?: { target_tab?: string; tab?: string } };
}
