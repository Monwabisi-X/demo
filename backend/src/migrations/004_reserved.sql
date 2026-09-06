-- 004_reserved.sql — Reserved placeholder (no-op).
--
-- The migration sequence originally skipped 004 and 005 (003_constraints.sql was followed by
-- 006_seed.sql), leaving a numbering gap. Renumbering 006/007 would break idempotency because
-- the runner tracks applied migrations by filename in app.schema_migrations. Instead we fill
-- the gap with explicit no-op placeholders so the sequence is contiguous and self-documenting.
--
-- Safe to run: performs no schema change.
SET search_path = app, public;

DO $$ BEGIN
    -- Intentionally empty. Reserved slot 004.
    NULL;
END $$;
