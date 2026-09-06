-- 008_phase3.sql — Feature tables closing problem-statement gaps:
--   goals, automated reminders, straight-through integration log, service requests,
--   claim lifecycle steps, and the SLA/FAIS mandate document types.
-- Idempotent; safe to re-run.
SET search_path = app, public;

-- ── Goals (adviser loads; client sees visual progress) ───────────────────────────
CREATE TABLE IF NOT EXISTS app.goals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    household_id uuid REFERENCES app.households(id),   -- set when the goal is shared
    scope varchar(20) NOT NULL DEFAULT 'individual',   -- individual | shared
    category varchar(80),                              -- RETIREMENT | EDUCATION | EMERGENCY | PROPERTY | OTHER
    name varchar(250) NOT NULL,
    description text,
    target_amount numeric(18,2) NOT NULL DEFAULT 0,
    current_amount numeric(18,2) NOT NULL DEFAULT 0,
    currency_code varchar(3) NOT NULL DEFAULT 'ZAR',
    target_date date,
    status varchar(30) NOT NULL DEFAULT 'active',       -- active | achieved | paused | cancelled
    created_by uuid REFERENCES app.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_client ON app.goals (client_id, status);

-- ── Reminder rules (recurring, growing list) ─────────────────────────────────────
-- audience: who receives the reminder — 'us' (advisers), 'client', or 'both'.
CREATE TABLE IF NOT EXISTS app.reminder_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    client_id uuid REFERENCES app.clients(id) ON DELETE CASCADE,  -- null = tenant-wide rule
    reminder_type varchar(100) NOT NULL,   -- VALUATION_CERT | LICENCE_EXPIRY | ANNUAL_REVIEW | RA_FEE_RENEWAL | BIRTHDAY | ANNIVERSARY | ...
    title varchar(250) NOT NULL,
    audience varchar(20) NOT NULL DEFAULT 'both',    -- us | client | both
    channel varchar(20) NOT NULL DEFAULT 'email',    -- email | sms | whatsapp
    -- Cadence expressed as an interval string (e.g. '2 years', '1 year', '1 month').
    cadence_interval varchar(40) NOT NULL DEFAULT '1 year',
    lead_days integer NOT NULL DEFAULT 14,           -- fire this many days before due
    next_run_at timestamptz NOT NULL DEFAULT now(),
    last_run_at timestamptz,
    entity_type varchar(100),                        -- optional link (policy, document, client)
    entity_id uuid,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_due ON app.reminder_rules (active, next_run_at);

-- ── Integration submissions (straight-through-to-provider audit + idempotency) ──────
CREATE TABLE IF NOT EXISTS app.integration_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    client_id uuid REFERENCES app.clients(id) ON DELETE SET NULL,
    provider varchar(80) NOT NULL,           -- santam | sanlam | discovery | liberty | old_mutual | ...
    submission_type varchar(100) NOT NULL,   -- CLAIM | POLICY_APPLICATION | DOCUMENT_REQUEST | ...
    channel varchar(30) NOT NULL DEFAULT 'api',  -- api | sftp | email
    idempotency_key varchar(200) NOT NULL,
    status varchar(40) NOT NULL DEFAULT 'pending', -- pending | simulated | dispatched | failed | acknowledged
    provider_reference varchar(200),
    request_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    response_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    error text,
    dispatched_at timestamptz,
    acknowledged_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_integration_submissions_client ON app.integration_submissions (client_id, status);

-- ── Service requests ("other tasks": change of address/bank, doc requests, etc.) ────
CREATE TABLE IF NOT EXISTS app.service_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    request_type varchar(80) NOT NULL,   -- CHANGE_OF_ADDRESS | CHANGE_OF_BANK | REQUEST_POLICY_DOCUMENT | REQUEST_BORDER_LETTER | REQUEST_IRP5 | REQUEST_CONSULTATION
    status varchar(40) NOT NULL DEFAULT 'submitted', -- submitted | in_progress | completed | cancelled
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    policy_id uuid REFERENCES app.policies(id),
    provider_id uuid REFERENCES app.providers(id),
    assigned_user_id uuid REFERENCES app.users(id),
    resolved_at timestamptz,
    created_by uuid REFERENCES app.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_requests_client ON app.service_requests (client_id, status);

-- ── Claim lifecycle steps (the multi-week motor claim journey) ──────────────────────
CREATE TABLE IF NOT EXISTS app.claim_lifecycle_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id uuid NOT NULL REFERENCES app.claims(id) ON DELETE CASCADE,
    step_key varchar(80) NOT NULL,       -- CLAIM_NUMBER_ISSUED | ASSESSMENT | REPAIR_QUOTES | AUTHORISED | ...
    step_order integer NOT NULL DEFAULT 0,
    status varchar(30) NOT NULL DEFAULT 'pending', -- pending | in_progress | done | skipped
    detail text,
    occurred_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (claim_id, step_key)
);
CREATE INDEX IF NOT EXISTS idx_claim_steps_claim ON app.claim_lifecycle_steps (claim_id, step_order);

-- ── Compliance / FAIS mandate document types ───────────────────────────────────────
INSERT INTO app.document_types (code, name, is_consent_artifact, special_personal_information, retention_days) VALUES
    ('SERVICE_LEVEL_AGREEMENT',   'Service Level Agreement',                 true,  false, 2555),
    ('NOTICE_OF_APPOINTMENT',     'Notice of Appointment as Financial Advisor', true, false, 2555),
    ('CONFIDENTIALITY_AGREEMENT', 'Confidentiality Agreement',               true,  false, 2555),
    ('FAIS_DISCLOSURE',           'FAIS Disclosure Record',                  true,  false, 2555)
ON CONFLICT (code) DO NOTHING;

-- ── Seed a couple of tenant-wide reminder rules for the demo tenant ─────────────────
INSERT INTO app.reminder_rules (tenant_id, reminder_type, title, audience, cadence_interval, lead_days)
VALUES
    ('00000000-0000-0000-0000-0000000000aa', 'VALUATION_CERT',  'Insurance valuation certificate (every 2 years)', 'both',   '2 years', 30),
    ('00000000-0000-0000-0000-0000000000aa', 'ANNUAL_REVIEW',   'Annual financial review meeting',                 'us',     '1 year',  21),
    ('00000000-0000-0000-0000-0000000000aa', 'RA_FEE_RENEWAL',  'Retirement fee renewal',                          'us',     '1 year',  14)
ON CONFLICT DO NOTHING;
