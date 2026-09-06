-- 011_reminder_outbox.sql — Durable reminder notification outbox and rule integrity.
-- The migration runner wraps this file in a transaction; indexes are intentionally non-concurrent.
SET search_path = app, public;

ALTER TABLE app.notifications
  ADD COLUMN IF NOT EXISTS reminder_rule_id uuid REFERENCES app.reminder_rules(id),
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS audience varchar(20),
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

ALTER TABLE app.notifications
  DROP CONSTRAINT IF EXISTS notifications_reminder_occurrence_complete,
  ADD CONSTRAINT notifications_reminder_occurrence_complete CHECK (
    (reminder_rule_id IS NULL AND scheduled_for IS NULL AND audience IS NULL)
    OR
    (reminder_rule_id IS NOT NULL AND scheduled_for IS NOT NULL AND audience IN ('us', 'client'))
  ),
  DROP CONSTRAINT IF EXISTS notifications_processing_state_consistent,
  ADD CONSTRAINT notifications_processing_state_consistent CHECK (
    (status = 'processing' AND processing_started_at IS NOT NULL)
    OR
    (status <> 'processing' AND processing_started_at IS NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_reminder_occurrence
  ON app.notifications (reminder_rule_id, scheduled_for, audience);

CREATE INDEX IF NOT EXISTS idx_notifications_queued_reconciliation
  ON app.notifications (status, processing_started_at, queued_at, id)
  WHERE status IN ('queued', 'processing');

ALTER TABLE app.reminder_rules
  ADD COLUMN IF NOT EXISTS cadence_anchor_day smallint,
  ADD COLUMN IF NOT EXISTS cadence_anchor_month_end boolean;

-- Repair any legacy cross-tenant reference before enforcing the composite relationship.
UPDATE app.reminder_rules AS rule
SET client_id = NULL,
    audience = 'us'
WHERE rule.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
      FROM app.clients AS client
     WHERE client.id = rule.client_id
       AND client.tenant_id = rule.tenant_id
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_tenant_id_id
  ON app.clients (tenant_id, id);

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'app.reminder_rules'::regclass
       AND conname = 'reminder_rules_tenant_client_fk'
  ) THEN
    ALTER TABLE app.reminder_rules
      ADD CONSTRAINT reminder_rules_tenant_client_fk
      FOREIGN KEY (tenant_id, client_id)
      REFERENCES app.clients (tenant_id, id);
  END IF;
END
$constraint$;

-- Tenant-wide rules cannot identify an individual client recipient. Preserve the existing
-- seeded/general rules as adviser-facing reminders instead of creating undeliverable client rows.
UPDATE app.reminder_rules
SET audience = 'us'
WHERE client_id IS NULL AND audience IN ('client', 'both');

ALTER TABLE app.reminder_rules
  DROP CONSTRAINT IF EXISTS reminder_rules_audience_valid,
  ADD CONSTRAINT reminder_rules_audience_valid CHECK (audience IN ('us', 'client', 'both')),
  DROP CONSTRAINT IF EXISTS reminder_rules_client_audience_targeted,
  ADD CONSTRAINT reminder_rules_client_audience_targeted CHECK (
    audience = 'us' OR client_id IS NOT NULL
  );

UPDATE app.reminder_rules
SET cadence_anchor_day = EXTRACT(DAY FROM next_run_at AT TIME ZONE 'UTC')::smallint,
    cadence_anchor_month_end = (
      (next_run_at AT TIME ZONE 'UTC')::date =
      (date_trunc('month', next_run_at AT TIME ZONE 'UTC') + interval '1 month - 1 day')::date
    )
WHERE cadence_anchor_day IS NULL OR cadence_anchor_month_end IS NULL;

ALTER TABLE app.reminder_rules
  ALTER COLUMN cadence_anchor_day SET NOT NULL,
  ALTER COLUMN cadence_anchor_month_end SET NOT NULL,
  DROP CONSTRAINT IF EXISTS reminder_rules_cadence_anchor_day_valid,
  ADD CONSTRAINT reminder_rules_cadence_anchor_day_valid
    CHECK (cadence_anchor_day BETWEEN 1 AND 31);

-- reminder_rules was introduced after the generic trigger attachment in migration 003.
DROP TRIGGER IF EXISTS trg_reminder_rules_updated_at ON app.reminder_rules;
CREATE TRIGGER trg_reminder_rules_updated_at
BEFORE UPDATE ON app.reminder_rules
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
