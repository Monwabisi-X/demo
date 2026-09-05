-- 006_seed.sql — Demo tenant + sample providers/products for local development.
-- Safe to run repeatedly (guards on existence). Never seed real client PII.
SET search_path = app, public;

INSERT INTO app.tenants (id, name, fsp_number, status)
VALUES ('00000000-0000-0000-0000-0000000000aa', 'Royal Square Financial (Demo)', 'FSP00000', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.providers (id, provider_type, legal_name, trading_name)
VALUES
    ('00000000-0000-0000-0000-0000000000b1', 'LIFE_INSURER', 'Demo Life Ltd', 'Demo Life'),
    ('00000000-0000-0000-0000-0000000000b2', 'INVESTMENT_PROVIDER', 'Demo Invest Ltd', 'Demo Invest')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.products (id, provider_id, category, product_code, product_name)
VALUES
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'LIFE', 'LIFE-STD', 'Life Cover'),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'RETIREMENT_ANNUITY', 'RA-STD', 'Retirement Annuity')
ON CONFLICT (id) DO NOTHING;
