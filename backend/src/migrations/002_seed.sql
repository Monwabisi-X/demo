-- 002_seed.sql — Roles and document types (incl. consent forms & T&Cs).
SET search_path = app, public;

INSERT INTO app.roles (code, name) VALUES
    ('PLATFORM_ADMIN', 'Platform Administrator'),
    ('COMPLIANCE_OFFICER', 'Compliance Officer'),
    ('ADVISER', 'Adviser'),
    ('ADVISER_ASSISTANT', 'Adviser Assistant / Back Office'),
    ('CLIENT', 'Client'),
    ('PROVIDER_SERVICE', 'Provider / Integration Service Account')
ON CONFLICT (code) DO NOTHING;

-- Document types. Consent artefacts (consent forms, T&Cs, disclosures) are flagged so the
-- application can enforce stricter handling and link them to consent records.
INSERT INTO app.document_types (code, name, is_consent_artifact, special_personal_information, retention_days) VALUES
    ('CONSENT_FORM',            'POPIA Consent Form',             true,  false, 2555),
    ('TERMS_AND_CONDITIONS',    'Terms and Conditions',           true,  false, 2555),
    ('POPIA_DISCLOSURE',        'POPIA Disclosure',               true,  false, 2555),
    ('MEDICAL_CONSENT',         'Medical Information Consent',    true,  true,  2555),
    ('FICA_ID',                 'FICA — Identity Document',       false, false, 1825),
    ('FICA_PROOF_OF_ADDRESS',   'FICA — Proof of Address',        false, false, 1825),
    ('POLICY_SCHEDULE',         'Policy Schedule',                false, false, 2555),
    ('ADVICE_RECORD',           'Record of Advice',               false, false, 2555),
    ('CLAIM_EVIDENCE',          'Claim Evidence',                 false, false, 1825),
    ('FINANCIAL_STATEMENT',     'Financial Statement',            false, false, 1825),
    ('SIGNED_APPLICATION',      'Signed Application',             false, false, 2555),
    ('OTHER',                   'Other Document',                 false, false, 1825)
ON CONFLICT (code) DO NOTHING;
