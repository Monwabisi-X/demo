-- 009_demo_users.sql — Demo sign-in accounts for local development.
-- Safe to re-run; uses ON CONFLICT guards and explicit role assignment.
SET search_path = app, public;

-- Demo client record used by the client dashboard and client user.
INSERT INTO app.clients (id, tenant_id, client_type, first_name, surname, fica_status, status)
VALUES (
    '00000000-0000-0000-0000-0000000000d1',
    '00000000-0000-0000-0000-0000000000aa',
    'individual',
    'Demo',
    'Client',
    'verified',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- Demo admin/adviser account for the adviser/admin portal and dashboard access.
INSERT INTO app.users (id, tenant_id, email, display_name, password_hash, status, client_id)
VALUES (
    '00000000-0000-0000-0000-0000000000e1',
    '00000000-0000-0000-0000-0000000000aa',
    'admin@royalsquare.co.za',
    'Demo Admin',
    '$2a$12$rsIIgiv7IOAbGNrdhf5IreyowYUeJ44KUJ3AV0Qbkk60xsyePjbrm',
    'active',
    NULL
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Demo client account for the client dashboard.
INSERT INTO app.users (id, tenant_id, email, display_name, password_hash, status, client_id)
VALUES (
    '00000000-0000-0000-0000-0000000000e2',
    '00000000-0000-0000-0000-0000000000aa',
    'client@royalsquare.co.za',
    'Demo Client',
    '$2a$12$rsIIgiv7IOAbGNrdhf5IreyowYUeJ44KUJ3AV0Qbkk60xsyePjbrm',
    'active',
    '00000000-0000-0000-0000-0000000000d1'
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Role mapping.
INSERT INTO app.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app.users u
JOIN app.roles r ON r.code IN ('PLATFORM_ADMIN', 'ADVISER')
WHERE u.email = 'admin@royalsquare.co.za'
ON CONFLICT DO NOTHING;

INSERT INTO app.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app.users u
JOIN app.roles r ON r.code = 'CLIENT'
WHERE u.email = 'client@royalsquare.co.za'
ON CONFLICT DO NOTHING;
