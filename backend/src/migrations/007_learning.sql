-- 007_learning.sql — Client-facing Information / Learning content.
--
-- A tenant-scoped library of training material and guides (car/motor, life, and accident/
-- disability claims) plus suggested-investment explainers. Content is deliberately generic
-- and educational — never advice, never client PII — so it is safe to expose to CLIENT users.
-- Editable in future via the admin/content APIs.
SET search_path = app, public;

CREATE TABLE IF NOT EXISTS app.learning_articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    -- High-level grouping used by the UI tab filters.
    category varchar(50) NOT NULL DEFAULT 'GUIDE',        -- CLAIM_GUIDE | INVESTMENT | TRAINING | GUIDE
    -- Finer topic tag (e.g. MOTOR, LIFE, ACCIDENT, RETIREMENT_ANNUITY, UNIT_TRUST, TAX_FREE).
    topic varchar(60),
    slug varchar(160) NOT NULL,
    title varchar(250) NOT NULL,
    summary varchar(500),
    -- Markdown/plain body rendered read-only in the client dashboard.
    body text NOT NULL DEFAULT '',
    -- Optional ordered checklist of steps (used by claim guides), stored as JSON array of strings.
    steps jsonb NOT NULL DEFAULT '[]'::jsonb,
    read_minutes integer NOT NULL DEFAULT 3,
    sort_order integer NOT NULL DEFAULT 100,
    published boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_learning_articles_tenant_pub
    ON app.learning_articles (tenant_id, published, category, sort_order);

-- ── Seed: educational content for the demo tenant ────────────────────────────────
-- Guards on (tenant_id, slug) so re-running is safe.
INSERT INTO app.learning_articles
    (tenant_id, category, topic, slug, title, summary, body, steps, read_minutes, sort_order)
VALUES
    -- Claim guides ---------------------------------------------------------------
    ('00000000-0000-0000-0000-0000000000aa', 'CLAIM_GUIDE', 'MOTOR',
     'how-to-claim-car-accident',
     'How to claim after a car accident',
     'A step-by-step guide to lodging a motor claim quickly and correctly, from the scene to settlement.',
     'A motor claim goes more smoothly when you gather the right information at the scene and lodge promptly. This guide walks you through what to do immediately after an accident, what your insurer will ask for, and how the claim is assessed. Remember: this is general information, not advice on your specific policy — check your policy schedule for excess, cover limits and any conditions.',
     '["Ensure everyone is safe and call emergency services if anyone is injured.",
       "Do not admit liability at the scene.",
       "Photograph all vehicles, damage, number plates, the road layout and any injuries.",
       "Exchange names, ID/licence, contact and insurer details with other drivers.",
       "Get a police case (SAPS) reference number — required for theft, hijacking or injury.",
       "Report the claim to your adviser or insurer within the time limit in your policy (often 24–48 hours).",
       "Submit photos, the police reference, your licence and a completed claim form.",
       "Arrange assessment/quotes at an approved repairer; pay your excess when work is authorised."]'::jsonb,
     4, 10),

    ('00000000-0000-0000-0000-0000000000aa', 'CLAIM_GUIDE', 'LIFE',
     'how-to-claim-life-cover',
     'How a life cover claim works',
     'What beneficiaries need to do to claim a life policy benefit, and the documents typically required.',
     'A life cover claim is lodged by the nominated beneficiary or the estate after the life assured has passed away. The insurer verifies the policy, the cause of death and the claimant''s identity before paying the benefit. Keeping your beneficiary nominations up to date is the single most important thing you can do to make a claim fast and painless for your family.',
     '["Notify your adviser or the insurer as soon as possible.",
       "Obtain the death certificate and, where required, the BI-1663 (notice of death).",
       "Provide the beneficiary''s ID and banking details for payment.",
       "Complete the insurer''s claim form; provide the policy number if known.",
       "For accidental or unnatural death, supply the police report / inquest reference.",
       "The insurer assesses and, once approved, pays the benefit to the nominated beneficiary."]'::jsonb,
     3, 20),

    ('00000000-0000-0000-0000-0000000000aa', 'CLAIM_GUIDE', 'ACCIDENT',
     'how-to-claim-accident-disability',
     'Claiming for accident, injury or disability',
     'How to claim under personal accident, income protection or disability benefits after an injury.',
     'Accident and disability benefits help replace income or provide a lump sum when an injury or illness stops you from working. Claims are medically assessed, so accurate, timely medical evidence is key. Different benefits (personal accident, income protection, lump-sum disability) have different waiting periods and definitions — your adviser can confirm which applies to you.',
     '["Get medical treatment and keep all reports, referrals and receipts.",
       "Notify your adviser or insurer of the injury or diagnosis promptly.",
       "Complete the claim form, including the treating doctor''s medical report.",
       "Provide proof of income if you are claiming income protection.",
       "Note any waiting period before benefits begin to pay.",
       "The insurer may request an independent medical assessment before approving.",
       "Approved income benefits are paid periodically; lump sums are paid once."]'::jsonb,
     4, 30),

    -- Suggested investments ------------------------------------------------------
    ('00000000-0000-0000-0000-0000000000aa', 'INVESTMENT', 'RETIREMENT_ANNUITY',
     'retirement-annuity-explained',
     'Retirement Annuity (RA): tax-smart retirement saving',
     'How an RA works, the tax benefits, and who it may suit — a general explainer to discuss with your adviser.',
     'A Retirement Annuity is a long-term, tax-efficient way to save for retirement. Contributions are tax-deductible within SARS limits, growth is not taxed inside the fund, and the savings are protected from creditors. Access is restricted until at least age 55, which enforces discipline. An RA can be a strong complement to a workplace pension. This is general information — your adviser will tailor a recommendation to your needs analysis.',
     '[]'::jsonb, 3, 40),

    ('00000000-0000-0000-0000-0000000000aa', 'INVESTMENT', 'TAX_FREE',
     'tax-free-savings-explained',
     'Tax-Free Savings Account (TFSA): growth free of tax',
     'The basics of a TFSA, annual and lifetime limits, and how it fits alongside other goals.',
     'A Tax-Free Savings Account lets your investment grow completely free of tax on interest, dividends and capital gains. There are annual and lifetime contribution limits set by SARS, and over-contributing is penalised, so it works best as a steady, long-term habit. TFSAs are flexible and can suit goals from an emergency buffer to long-term wealth building. Speak to your adviser about the right underlying funds.',
     '[]'::jsonb, 3, 50),

    ('00000000-0000-0000-0000-0000000000aa', 'INVESTMENT', 'UNIT_TRUST',
     'unit-trusts-explained',
     'Unit Trusts: goal-based investing, diversified',
     'What unit trusts are, how diversification reduces risk, and matching a fund to your time horizon.',
     'Unit trusts pool many investors'' money into professionally managed, diversified portfolios. You can choose funds that match your goal and time horizon — from lower-risk income funds to growth-oriented equity funds. Because your money is spread across many assets, the impact of any single holding is reduced. Unit trusts are flexible with no fixed term, which makes them useful for medium- to long-term goals.',
     '[]'::jsonb, 3, 60),

    -- Training / general ---------------------------------------------------------
    ('00000000-0000-0000-0000-0000000000aa', 'TRAINING', 'GENERAL',
     'understanding-your-cover',
     'Understanding your cover: excess, waiting periods and exclusions',
     'A short primer on the terms that most affect how and when a claim pays out.',
     'Three terms shape almost every claim outcome: the excess (the first amount you pay), waiting periods (time before certain benefits start), and exclusions (events not covered). Reading your policy schedule for these three items — and asking your adviser about anything unclear — is the best way to avoid surprises at claim time.',
     '[]'::jsonb, 2, 70)
ON CONFLICT (tenant_id, slug) DO NOTHING;
