-- 003_constraints.sql — Indexes, immutability trigger, updated_at triggers.
SET search_path = app, public;

-- Helpful indexes.
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON app.clients(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_client ON app.assets(client_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_client ON app.liabilities(client_id);
CREATE INDEX IF NOT EXISTS idx_income_client ON app.income_sources(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON app.expenses(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_client ON app.policies(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_client_status ON app.claims(client_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_client ON app.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_consents_client_purpose ON app.consents(client_id, purpose_code, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_status ON app.adviser_staging_queue(status);
CREATE INDEX IF NOT EXISTS idx_legacy_status ON app.legacy_import_staging(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON app.audit_events(entity_type, entity_id, occurred_at DESC);

-- updated_at trigger function + attachment for tables that have updated_at.
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$;

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'app' AND c.column_name = 'updated_at'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON app.%I', r.table_name, r.table_name);
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON app.%I
             FOR EACH ROW EXECUTE FUNCTION app.set_updated_at()',
            r.table_name, r.table_name);
    END LOOP;
END $$;

-- Immutable audit trail: block UPDATE/DELETE on audit_events.
CREATE OR REPLACE FUNCTION app.prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_immutable ON app.audit_events;
CREATE TRIGGER trg_audit_immutable
    BEFORE UPDATE OR DELETE ON app.audit_events
    FOR EACH ROW EXECUTE FUNCTION app.prevent_audit_mutation();
