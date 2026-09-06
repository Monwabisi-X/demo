-- 010_demo_production_seed.sql — production-style demo data for the Royal Square tenant.
-- This script intentionally creates realistic client-linked records and is safe to re-run.
SET search_path = app, public;

-- 1) Households: 20 demo households for the tenant.
INSERT INTO app.households (id, tenant_id, name)
SELECT gen_random_uuid(),
       '00000000-0000-0000-0000-0000000000aa'::uuid,
       'Household ' || gs::text
FROM generate_series(1, 20) AS gs
WHERE NOT EXISTS (
    SELECT 1 FROM app.households h
    WHERE h.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
      AND h.name = 'Household ' || gs::text
);

-- 2) Clients: 20 active, tenant-scoped client records.
INSERT INTO app.clients (
    id, tenant_id, household_id, client_type, title, first_name, surname,
    email_ciphertext, mobile_ciphertext, fica_status, status, net_worth, extension_data
)
SELECT gen_random_uuid(),
       '00000000-0000-0000-0000-0000000000aa'::uuid,
       (SELECT h.id FROM app.households h WHERE h.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid AND h.name = 'Household ' || gs::text LIMIT 1),
       'individual',
       CASE WHEN gs % 2 = 0 THEN 'Ms' ELSE 'Mr' END,
       'Client ' || gs::text,
       'Surname ' || gs::text,
       'client' || gs::text || '@royalsquare.co.za',
       '+2760' || lpad(gs::text, 6, '0'),
       'verified',
       'active',
       (250000 + gs * 30000)::numeric(18,2),
       jsonb_build_object(
           'employment_status', CASE WHEN gs % 3 = 0 THEN 'Self-employed' ELSE 'Employed' END,
           'risk_profile', CASE WHEN gs % 4 = 0 THEN 'Balanced' WHEN gs % 4 = 1 THEN 'Growth' WHEN gs % 4 = 2 THEN 'Conservative' ELSE 'Moderate' END,
           'life_stage', CASE WHEN gs <= 5 THEN 'Young family' WHEN gs <= 10 THEN 'Established family' WHEN gs <= 15 THEN 'Pre-retirement' ELSE 'Retirement planning' END
       )
FROM generate_series(1, 20) AS gs
WHERE NOT EXISTS (
    SELECT 1 FROM app.clients c
    WHERE c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
      AND c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
);

-- 3) Client users and role assignment: 20 linked users, one per client.
INSERT INTO app.users (id, tenant_id, email, display_name, password_hash, status, client_id)
SELECT gen_random_uuid(),
       '00000000-0000-0000-0000-0000000000aa'::uuid,
       'client' || gs::text || '@royalsquare.co.za',
       'Client ' || gs::text || ' Surname ' || gs::text,
       '$2a$12$rsIIgiv7IOAbGNrdhf5IreyowYUeJ44KUJ3AV0Qbkk60xsyePjbrm',
       'active',
       (SELECT c.id FROM app.clients c WHERE c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid AND c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za' LIMIT 1)
FROM generate_series(1, 20) AS gs
WHERE NOT EXISTS (
    SELECT 1 FROM app.users u
    WHERE u.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
      AND u.email = 'client' || gs::text || '@royalsquare.co.za'
);

INSERT INTO app.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app.users u
JOIN app.roles r ON r.code = 'CLIENT'
WHERE u.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
  AND u.email LIKE 'client%@royalsquare.co.za'
ON CONFLICT DO NOTHING;

-- 4) Assets: 20 general client asset records.
INSERT INTO app.assets (id, client_id, category, description, current_value, ownership_percentage, currency_code, status)
SELECT gen_random_uuid(),
       c.id,
       CASE WHEN gs % 5 = 0 THEN 'Vehicle' WHEN gs % 5 = 1 THEN 'Property' WHEN gs % 5 = 2 THEN 'Investment' WHEN gs % 5 = 3 THEN 'Retirement' ELSE 'Savings' END,
       CASE WHEN gs % 5 = 0 THEN 'Motor vehicle' WHEN gs % 5 = 1 THEN 'Primary residence' WHEN gs % 5 = 2 THEN 'Managed investment portfolio' WHEN gs % 5 = 3 THEN 'Retirement account' ELSE 'Cash reserve' END,
       (180000 + gs * 24000)::numeric(18,2),
       100.0000,
       'ZAR',
       'active'
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
WHERE c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
ON CONFLICT (id) DO NOTHING;

-- 5) Income: 20 income sources.
INSERT INTO app.income_sources (id, client_id, category, description, amount, frequency, currency_code, valid_from)
SELECT gen_random_uuid(),
       c.id,
       CASE WHEN gs % 4 = 0 THEN 'Salary' WHEN gs % 4 = 1 THEN 'Commission' WHEN gs % 4 = 2 THEN 'Business' ELSE 'Rental' END,
       CASE WHEN gs % 4 = 0 THEN 'Primary salary' WHEN gs % 4 = 1 THEN 'Sales commission' WHEN gs % 4 = 2 THEN 'Business income' ELSE 'Rental income' END,
       (18000 + gs * 1350)::numeric(18,2),
       'monthly',
       'ZAR',
       date '2024-01-01' + (gs || ' months')::interval
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
WHERE c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
ON CONFLICT (id) DO NOTHING;

-- 6) Expenses: 20 recurring household expenses.
INSERT INTO app.expenses (id, client_id, category, description, amount, frequency, currency_code, valid_from)
SELECT gen_random_uuid(),
       c.id,
       CASE WHEN gs % 5 = 0 THEN 'Housing' WHEN gs % 5 = 1 THEN 'Transport' WHEN gs % 5 = 2 THEN 'Education' WHEN gs % 5 = 3 THEN 'Insurance' ELSE 'Lifestyle' END,
       CASE WHEN gs % 5 = 0 THEN 'Home bond' WHEN gs % 5 = 1 THEN 'Fuel and vehicle costs' WHEN gs % 5 = 2 THEN 'School fees' WHEN gs % 5 = 3 THEN 'Insurance premiums' ELSE 'Family living costs' END,
       (3500 + gs * 275)::numeric(18,2),
       'monthly',
       'ZAR',
       date '2024-01-01' + (gs || ' months')::interval
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
WHERE c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
ON CONFLICT (id) DO NOTHING;

-- 7) Liabilities: 20 debt or credit obligations.
INSERT INTO app.liabilities (id, client_id, category, creditor_name, current_balance, monthly_payment, interest_rate, currency_code, status)
SELECT gen_random_uuid(),
       c.id,
       CASE WHEN gs % 4 = 0 THEN 'Home loan' WHEN gs % 4 = 1 THEN 'Vehicle finance' WHEN gs % 4 = 2 THEN 'Store credit' ELSE 'Personal loan' END,
       CASE WHEN gs % 4 = 0 THEN 'Urban Trust' WHEN gs % 4 = 1 THEN 'Drive Finance' WHEN gs % 4 = 2 THEN 'Retail Credit' ELSE 'Family Bank' END,
       (42000 + gs * 4300)::numeric(18,2),
       (1200 + gs * 80)::numeric(18,2),
       (8.25 + (gs % 5) * 0.75)::numeric(9,4),
       'ZAR',
       'active'
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
WHERE c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
ON CONFLICT (id) DO NOTHING;

-- 8) Goals: 20 planning goals.
INSERT INTO app.goals (id, tenant_id, client_id, household_id, scope, category, name, description, target_amount, current_amount, currency_code, target_date, status)
SELECT gen_random_uuid(),
       '00000000-0000-0000-0000-0000000000aa'::uuid,
       c.id,
       c.household_id,
       'individual',
       CASE WHEN gs % 4 = 0 THEN 'Education' WHEN gs % 4 = 1 THEN 'Retirement' WHEN gs % 4 = 2 THEN 'Travel' ELSE 'Property' END,
       CASE WHEN gs % 4 = 0 THEN 'Education fund' WHEN gs % 4 = 1 THEN 'Retirement reserve' WHEN gs % 4 = 2 THEN 'Holiday fund' ELSE 'Home upgrade fund' END,
       'Primary household financial goal supporting future milestones and lifestyle security.',
       (180000 + gs * 25000)::numeric(18,2),
       (44000 + gs * 5200)::numeric(18,2),
       'ZAR',
       date '2027-06-30' + (gs || ' months')::interval,
       'active'
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
WHERE c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
ON CONFLICT (id) DO NOTHING;

-- 9) Policies: 20 active policies attached to client records.
INSERT INTO app.policies (
    id, client_id, provider_id, product_id, policy_number_masked,
    premium, contribution, cover_amount, current_value, currency_code,
    start_date, renewal_date, status
)
SELECT gen_random_uuid(),
       c.id,
       CASE WHEN gs % 2 = 0 THEN '00000000-0000-0000-0000-0000000000b1'::uuid ELSE '00000000-0000-0000-0000-0000000000b2'::uuid END,
       CASE WHEN gs % 2 = 0 THEN '00000000-0000-0000-0000-0000000000c1'::uuid ELSE '00000000-0000-0000-0000-0000000000c2'::uuid END,
       'POL-' || gs::text || '-####',
       (1300 + gs * 75)::numeric(18,2),
       (1500 + gs * 110)::numeric(18,2),
       (320000 + gs * 22000)::numeric(18,2),
       (140000 + gs * 18000)::numeric(18,2),
       'ZAR',
       date '2023-01-01' + (gs || ' months')::interval,
       date '2025-01-01' + (gs || ' months')::interval,
       'active'
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid
WHERE c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
ON CONFLICT (id) DO NOTHING;

-- 10) Claims: 20 client claims, all linked to a valid client and policy.
INSERT INTO app.claims (
    id, client_id, policy_id, provider_id,
    claim_number_masked, claim_type, status, reported_at, loss_date, narrative, incident_data
)
SELECT gen_random_uuid(),
       c.id,
       p.id,
       CASE WHEN gs % 2 = 0 THEN '00000000-0000-0000-0000-0000000000b1'::uuid ELSE '00000000-0000-0000-0000-0000000000b2'::uuid END,
       'CLM-' || gs::text || '-####',
       CASE WHEN gs % 3 = 0 THEN 'motor' WHEN gs % 3 = 1 THEN 'life' ELSE 'disability' END,
       CASE WHEN gs % 4 = 0 THEN 'APPROVED' WHEN gs % 4 = 1 THEN 'UNDER_REVIEW' WHEN gs % 4 = 2 THEN 'REPORTED' ELSE 'PAID' END,
       now() - (gs * interval '8 days'),
       now() - (gs * interval '10 days'),
       'Client claim lodged for review and settlement under the active policy terms.',
       jsonb_build_object(
           'severity', CASE WHEN gs % 3 = 0 THEN 'medium' ELSE 'high' END,
           'source', 'portal_submission',
           'region', CASE WHEN gs % 2 = 0 THEN 'Gauteng' ELSE 'Western Cape' END
       )
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid AND c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
JOIN app.policies p ON p.client_id = c.id
WHERE p.policy_number_masked = 'POL-' || gs::text || '-####'
ON CONFLICT (id) DO NOTHING;

-- 11) Notifications: 20 communications linked to client records.
INSERT INTO app.notifications (id, client_id, user_id, channel, template_code, recipient, message_body_snapshot, status)
SELECT gen_random_uuid(),
       c.id,
       u.id,
       CASE WHEN gs % 3 = 0 THEN 'email' WHEN gs % 3 = 1 THEN 'sms' ELSE 'in_app' END,
       CASE WHEN gs % 3 = 0 THEN 'policy_review' WHEN gs % 3 = 1 THEN 'premium_due' ELSE 'claim_update' END,
       'client' || gs::text || '@royalsquare.co.za',
       'Portfolio update and next action summary for your financial plan.',
       'sent'
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid AND c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
JOIN app.users u ON u.tenant_id = c.tenant_id AND u.email = c.email_ciphertext
ON CONFLICT (id) DO NOTHING;

-- 12) Tasks: 20 workflow tasks assigned to users and clients.
INSERT INTO app.tasks (id, client_id, assigned_user_id, title, description, status, priority, due_at, entity_type)
SELECT gen_random_uuid(),
       c.id,
       u.id,
       'Follow up on goal ' || gs::text,
       'Review financial plan, document updates and policy suitability for this client with the adviser.',
       CASE WHEN gs % 3 = 0 THEN 'open' WHEN gs % 3 = 1 THEN 'in_progress' ELSE 'completed' END,
       CASE WHEN gs % 3 = 0 THEN 'high' WHEN gs % 3 = 1 THEN 'normal' ELSE 'low' END,
       now() + (gs || ' days')::interval,
       'goal'
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid AND c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
JOIN app.users u ON u.tenant_id = c.tenant_id AND u.email = c.email_ciphertext
ON CONFLICT (id) DO NOTHING;

-- 13) Documents: 20 support records for client processing.
INSERT INTO app.documents (
    id, tenant_id, client_id, document_type_id, title, description,
    s3_bucket, s3_key, mime_type, classification, upload_status, review_status,
    uploaded_by, uploaded_at
)
SELECT gen_random_uuid(),
       '00000000-0000-0000-0000-0000000000aa'::uuid,
       c.id,
       CASE
         WHEN gs % 4 = 0 THEN (SELECT id FROM app.document_types WHERE code = 'POPIA_DISCLOSURE')
         WHEN gs % 4 = 1 THEN (SELECT id FROM app.document_types WHERE code = 'FICA_ID')
         WHEN gs % 4 = 2 THEN (SELECT id FROM app.document_types WHERE code = 'POLICY_SCHEDULE')
         ELSE (SELECT id FROM app.document_types WHERE code = 'FINANCIAL_STATEMENT')
       END,
       'Document ' || gs::text,
       'Supporting client onboarding and servicing documentation.',
       'royalsquare-demo-docs',
       'tenant/demo/client-' || gs::text || '/document-' || gs::text || '.pdf',
       'application/pdf',
       'confidential',
       'uploaded',
       CASE WHEN gs % 2 = 0 THEN 'approved' ELSE 'review_required' END,
       u.id,
       now() - (gs || ' days')::interval
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid AND c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
JOIN app.users u ON u.tenant_id = c.tenant_id AND u.email = c.email_ciphertext
ON CONFLICT (id) DO NOTHING;

-- 14) Consents: 20 consent records tied to client documents.
INSERT INTO app.consents (
    id, client_id, purpose_code, purpose_description, consent_version,
    granted, captured_at, capture_method, source_ip, evidence_document_id
)
SELECT gen_random_uuid(),
       c.id,
       CASE WHEN gs % 4 = 0 THEN 'financial_advice' WHEN gs % 4 = 1 THEN 'marketing' WHEN gs % 4 = 2 THEN 'data_processing' ELSE 'portfolio_review' END,
       'Client consent recorded for processing the required personal information and support workflow.',
       'v1.0',
       true,
       now() - (gs || ' days')::interval,
       'portal',
       '10.0.0.' || gs::text,
       d.id
FROM generate_series(1, 20) AS gs
JOIN app.clients c ON c.tenant_id = '00000000-0000-0000-0000-0000000000aa'::uuid AND c.email_ciphertext = 'client' || gs::text || '@royalsquare.co.za'
JOIN app.documents d ON d.client_id = c.id AND d.title = 'Document ' || gs::text
ON CONFLICT (id) DO NOTHING;
