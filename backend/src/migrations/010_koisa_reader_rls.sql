-- Dedicated, transaction-scoped read boundary for authenticated Koisa tools.
-- RLS is enabled but not forced: table-owning migration/application queries retain their
-- existing behavior. Only code that explicitly SET LOCAL ROLE rsf_koisa_reader is restricted.

DO $role$
DECLARE
  unsafe_role boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rsf_koisa_reader') THEN
    CREATE ROLE rsf_koisa_reader NOLOGIN;
  END IF;

  SELECT rolsuper OR rolbypassrls OR rolreplication
    INTO unsafe_role
    FROM pg_roles
   WHERE rolname = 'rsf_koisa_reader';

  IF unsafe_role THEN
    RAISE EXCEPTION 'rsf_koisa_reader must not be SUPERUSER, BYPASSRLS, or REPLICATION';
  END IF;
END
$role$;

-- RDS master users are CREATEROLE principals, not PostgreSQL superusers. Do not include
-- NOSUPERUSER/NOBYPASSRLS/NOREPLICATION here: changing those attributes is privileged on
-- PostgreSQL 16. New roles already default to false; the block above fails closed for an unsafe pre-existing role.
ALTER ROLE rsf_koisa_reader
  NOLOGIN NOCREATEDB NOCREATEROLE NOINHERIT;

-- PostgreSQL roles are cluster-wide. Revoke any stale app access before granting only the
-- tables and columns used by authenticated Koisa plus the linkage verification query.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA app FROM rsf_koisa_reader;
GRANT USAGE ON SCHEMA app TO rsf_koisa_reader;

GRANT SELECT (id, tenant_id, client_id, status, deleted_at)
  ON app.users TO rsf_koisa_reader;
GRANT SELECT (id, tenant_id, status, deleted_at)
  ON app.clients TO rsf_koisa_reader;
GRANT SELECT (client_id, current_value, status)
  ON app.assets TO rsf_koisa_reader;
GRANT SELECT (client_id, current_balance, status)
  ON app.liabilities TO rsf_koisa_reader;
GRANT SELECT (client_id, amount, frequency)
  ON app.income_sources TO rsf_koisa_reader;
GRANT SELECT (client_id, amount, frequency)
  ON app.expenses TO rsf_koisa_reader;
GRANT SELECT (id, client_id, provider_id, product_id, status, created_at)
  ON app.policies TO rsf_koisa_reader;
GRANT SELECT (id, trading_name, legal_name)
  ON app.providers TO rsf_koisa_reader;
GRANT SELECT (id, product_name, category)
  ON app.products TO rsf_koisa_reader;

-- The migration owner must be able to assume the NOLOGIN role. This is explicit rather than
-- relying on inherited privileges, and SET LOCAL ROLE resets automatically at transaction end.
DO $membership$
BEGIN
  EXECUTE format(
    'GRANT rsf_koisa_reader TO %I WITH INHERIT FALSE, SET TRUE',
    current_user
  );
END
$membership$;

ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS koisa_reader_isolation ON app.users;
CREATE POLICY koisa_reader_isolation ON app.users
  FOR SELECT TO rsf_koisa_reader
  USING (
    id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND client_id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
  );

DROP POLICY IF EXISTS koisa_reader_isolation ON app.clients;
CREATE POLICY koisa_reader_isolation ON app.clients
  FOR SELECT TO rsf_koisa_reader
  USING (
    id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

DROP POLICY IF EXISTS koisa_reader_isolation ON app.assets;
CREATE POLICY koisa_reader_isolation ON app.assets
  FOR SELECT TO rsf_koisa_reader
  USING (
    client_id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM app.clients AS c
      WHERE c.id = assets.client_id
        AND c.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
  );

DROP POLICY IF EXISTS koisa_reader_isolation ON app.liabilities;
CREATE POLICY koisa_reader_isolation ON app.liabilities
  FOR SELECT TO rsf_koisa_reader
  USING (
    client_id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM app.clients AS c
      WHERE c.id = liabilities.client_id
        AND c.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
  );

DROP POLICY IF EXISTS koisa_reader_isolation ON app.income_sources;
CREATE POLICY koisa_reader_isolation ON app.income_sources
  FOR SELECT TO rsf_koisa_reader
  USING (
    client_id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM app.clients AS c
      WHERE c.id = income_sources.client_id
        AND c.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
  );

DROP POLICY IF EXISTS koisa_reader_isolation ON app.expenses;
CREATE POLICY koisa_reader_isolation ON app.expenses
  FOR SELECT TO rsf_koisa_reader
  USING (
    client_id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM app.clients AS c
      WHERE c.id = expenses.client_id
        AND c.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
  );

DROP POLICY IF EXISTS koisa_reader_isolation ON app.policies;
CREATE POLICY koisa_reader_isolation ON app.policies
  FOR SELECT TO rsf_koisa_reader
  USING (
    client_id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
    AND EXISTS (
      SELECT 1 FROM app.clients AS c
      WHERE c.id = policies.client_id
        AND c.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
  );

DROP POLICY IF EXISTS koisa_reader_isolation ON app.providers;
CREATE POLICY koisa_reader_isolation ON app.providers
  FOR SELECT TO rsf_koisa_reader
  USING (
    EXISTS (
      SELECT 1
      FROM app.policies AS p
      JOIN app.clients AS c ON c.id = p.client_id
      WHERE p.provider_id = providers.id
        AND p.client_id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
        AND c.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
  );

DROP POLICY IF EXISTS koisa_reader_isolation ON app.products;
CREATE POLICY koisa_reader_isolation ON app.products
  FOR SELECT TO rsf_koisa_reader
  USING (
    EXISTS (
      SELECT 1
      FROM app.policies AS p
      JOIN app.clients AS c ON c.id = p.client_id
      WHERE p.product_id = products.id
        AND p.client_id = NULLIF(current_setting('app.current_client_id', true), '')::uuid
        AND c.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    )
  );
