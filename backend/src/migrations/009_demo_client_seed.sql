-- 009_demo_client_seed.sql — A real, working demo CLIENT login for local testing.
--
-- Previously only a demo TENANT existed (006_seed.sql); there was no demo USER at all, so
-- any "seed" login attempt correctly failed with 401 (not the 500 some people hit locally —
-- that 500 is almost always an unmigrated database; see errorHandler.js SCHEMA_NOT_READY).
--
-- Credentials (LOCAL/DEV ONLY — never use in production):
--   email:    demo.client@royalsquare.co.za
--   password: DemoClient123!
--
-- NOTE: use a real-looking TLD (.co.za), not .test — the backend's Joi email validator
-- (joi's TLD allow-list) rejects reserved test TLDs like .test/.example/.invalid.
--
-- The password hash below is bcrypt(12) of "DemoClient123!". Never commit real credentials
-- this way for a production tenant — this migration is for the local/dev demo tenant only.
SET search_path = app, public;

DO $$
DECLARE
    v_tenant_id uuid := '00000000-0000-0000-0000-0000000000aa';
    v_client_id uuid;
    v_user_id uuid;
    v_role_id uuid;
BEGIN
    -- Idempotent: skip entirely if the demo user already exists.
    SELECT id INTO v_user_id FROM app.users
     WHERE tenant_id = v_tenant_id AND email = 'demo.client@royalsquare.co.za';

    IF v_user_id IS NULL THEN
        INSERT INTO app.clients (id, tenant_id, client_type, title, first_name, surname, fica_status, status)
        VALUES (gen_random_uuid(), v_tenant_id, 'individual', 'Ms', 'Demo', 'Client', 'verified', 'active')
        RETURNING id INTO v_client_id;

        INSERT INTO app.users (id, tenant_id, email, display_name, password_hash, status, client_id)
        VALUES (
            gen_random_uuid(),
            v_tenant_id,
            'demo.client@royalsquare.co.za',
            'Demo Client',
            '$2a$12$726qY0GD9JFm8RVYLJGZcu7UDYSGB7rtW0t5mtfbDF/HZYLk/Ec36',
            'active',
            v_client_id
        )
        RETURNING id INTO v_user_id;

        SELECT id INTO v_role_id FROM app.roles WHERE code = 'CLIENT';
        IF v_role_id IS NOT NULL THEN
            INSERT INTO app.user_roles (user_id, role_id) VALUES (v_user_id, v_role_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;
