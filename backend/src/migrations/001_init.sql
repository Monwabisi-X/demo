-- 001_init.sql — Backend schema (app schema), aligned to the Sequelize models.
-- Idempotent where practical so re-running during development is safe.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA IF NOT EXISTS app;
SET search_path = app, public;

CREATE TABLE IF NOT EXISTS app.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(200) NOT NULL,
    registration_number varchar(100),
    fsp_number varchar(50),
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL UNIQUE,
    name varchar(150) NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id),
    email citext NOT NULL,
    display_name varchar(200) NOT NULL,
    password_hash text,
    status varchar(20) NOT NULL DEFAULT 'active',
    client_id uuid,
    mfa_enabled boolean NOT NULL DEFAULT false,
    last_login_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS app.user_roles (
    user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES app.roles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS app.households (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id),
    name varchar(200) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id),
    household_id uuid REFERENCES app.households(id),
    client_type varchar(20) NOT NULL DEFAULT 'individual',
    title varchar(30),
    first_name varchar(100),
    surname varchar(100),
    legal_entity_name varchar(250),
    id_number_ciphertext text,
    id_number_hash bytea,
    passport_number_ciphertext text,
    tax_number_ciphertext text,
    email_ciphertext text,
    mobile_ciphertext text,
    fica_status varchar(30) NOT NULL DEFAULT 'pending',
    net_worth numeric(18,2),
    status varchar(20) NOT NULL DEFAULT 'active',
    archived_at timestamptz,
    deleted_at timestamptz,
    extension_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    category varchar(80) NOT NULL,
    description varchar(250) NOT NULL,
    current_value numeric(18,2) NOT NULL DEFAULT 0,
    ownership_percentage numeric(7,4) NOT NULL DEFAULT 100,
    currency_code varchar(3) NOT NULL DEFAULT 'ZAR',
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.liabilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    category varchar(80) NOT NULL,
    creditor_name varchar(250),
    current_balance numeric(18,2) NOT NULL DEFAULT 0,
    monthly_payment numeric(18,2),
    interest_rate numeric(9,4),
    currency_code varchar(3) NOT NULL DEFAULT 'ZAR',
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.income_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    category varchar(80) NOT NULL,
    description varchar(250),
    amount numeric(18,2) NOT NULL,
    frequency varchar(20) NOT NULL DEFAULT 'monthly',
    currency_code varchar(3) NOT NULL DEFAULT 'ZAR',
    valid_from date,
    valid_to date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    category varchar(80) NOT NULL,
    description varchar(250),
    amount numeric(18,2) NOT NULL,
    frequency varchar(20) NOT NULL DEFAULT 'monthly',
    currency_code varchar(3) NOT NULL DEFAULT 'ZAR',
    valid_from date,
    valid_to date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type varchar(80),
    legal_name varchar(250) NOT NULL,
    trading_name varchar(250),
    contact_email citext,
    active boolean NOT NULL DEFAULT true,
    extension_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES app.providers(id) ON DELETE CASCADE,
    category varchar(100) NOT NULL,
    product_code varchar(100),
    product_name varchar(250) NOT NULL,
    description text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    provider_id uuid NOT NULL REFERENCES app.providers(id),
    product_id uuid NOT NULL REFERENCES app.products(id),
    policy_number_masked varchar(100),
    policy_number_ciphertext text,
    premium numeric(18,2),
    contribution numeric(18,2),
    cover_amount numeric(18,2),
    current_value numeric(18,2),
    currency_code varchar(3) NOT NULL DEFAULT 'ZAR',
    start_date date,
    renewal_date date,
    end_date date,
    status varchar(50) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    policy_id uuid REFERENCES app.policies(id),
    provider_id uuid REFERENCES app.providers(id),
    claim_number_masked varchar(100),
    claim_type varchar(80) NOT NULL DEFAULT 'motor',
    status varchar(80) NOT NULL DEFAULT 'REPORTED',
    reported_at timestamptz NOT NULL DEFAULT now(),
    loss_date timestamptz,
    narrative text,
    incident_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.document_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(100) NOT NULL UNIQUE,
    name varchar(200) NOT NULL,
    description text,
    is_consent_artifact boolean NOT NULL DEFAULT false,
    special_personal_information boolean NOT NULL DEFAULT false,
    retention_days integer,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id),
    client_id uuid REFERENCES app.clients(id),
    document_type_id uuid NOT NULL REFERENCES app.document_types(id),
    title varchar(250) NOT NULL,
    description text,
    s3_bucket varchar(250),
    s3_key varchar(1000),
    s3_version_id varchar(500),
    checksum_sha256 char(64),
    mime_type varchar(150),
    file_size_bytes bigint,
    kms_key_id varchar(500),
    classification varchar(50) NOT NULL DEFAULT 'confidential',
    upload_status varchar(30) NOT NULL DEFAULT 'pending',
    virus_scan_status varchar(30) NOT NULL DEFAULT 'pending',
    review_status varchar(30) NOT NULL DEFAULT 'pending',
    review_date date,
    expiry_date date,
    uploaded_by uuid,
    uploaded_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    purpose_code varchar(100) NOT NULL,
    purpose_description text NOT NULL,
    consent_version varchar(50) NOT NULL,
    granted boolean NOT NULL,
    captured_at timestamptz NOT NULL DEFAULT now(),
    withdrawn_at timestamptz,
    capture_method varchar(50),
    source_ip varchar(64),
    evidence_document_id uuid REFERENCES app.documents(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES app.clients(id),
    user_id uuid REFERENCES app.users(id),
    channel varchar(30) NOT NULL,
    template_code varchar(100),
    recipient varchar(320),
    message_body_snapshot text,
    status varchar(40) NOT NULL DEFAULT 'queued',
    retry_count integer NOT NULL DEFAULT 0,
    queued_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    failed_at timestamptz,
    failure_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES app.clients(id),
    assigned_user_id uuid REFERENCES app.users(id),
    title varchar(250) NOT NULL,
    description text,
    status varchar(20) NOT NULL DEFAULT 'open',
    priority varchar(20) NOT NULL DEFAULT 'normal',
    due_at timestamptz,
    completed_at timestamptz,
    entity_type varchar(100),
    entity_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    actor_user_id uuid,
    actor_role_code varchar(100),
    action varchar(100) NOT NULL,
    entity_type varchar(100) NOT NULL,
    entity_id uuid,
    before_data jsonb,
    after_data jsonb,
    reason text,
    ip_address varchar(64),
    request_id varchar(200),
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS app.medical_questionnaires (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    questionnaire_version varchar(50) NOT NULL,
    status varchar(50) NOT NULL DEFAULT 'draft',
    payload_ciphertext bytea,
    encrypted_data_key bytea,
    kms_key_id varchar(500),
    access_classification varchar(50) NOT NULL DEFAULT 'special_personal_information',
    submitted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.adviser_staging_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id),
    client_id uuid REFERENCES app.clients(id),
    submission_type varchar(100) NOT NULL,
    client_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    adviser_edits jsonb NOT NULL DEFAULT '{}'::jsonb,
    status varchar(40) NOT NULL DEFAULT 'PENDING_REVIEW',
    reviewed_by uuid,
    reviewed_at timestamptz,
    rejection_reason text,
    dispatched_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.risk_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    questionnaire_code varchar(100) NOT NULL,
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    calculated_score numeric(8,2),
    calculated_profile varchar(80),
    adviser_override_profile varchar(80),
    target_allocation jsonb NOT NULL DEFAULT '{}'::jsonb,
    status varchar(40) NOT NULL DEFAULT 'completed',
    assessed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.legacy_import_staging (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id),
    source_filename varchar(500),
    source_format varchar(20),
    s3_key varchar(1000),
    raw_row jsonb NOT NULL DEFAULT '{}'::jsonb,
    normalized_row jsonb,
    status varchar(40) NOT NULL DEFAULT 'RECEIVED',
    validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
    promoted_client_id uuid,
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
