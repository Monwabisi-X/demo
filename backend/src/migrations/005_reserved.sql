-- 005_reserved.sql — Reserved placeholder (no-op).
--
-- See 004_reserved.sql. This fills the second gap (005) in the migration numbering so the
-- ordered sequence 001..007 is contiguous. Performs no schema change.
SET search_path = app, public;

DO $$ BEGIN
    -- Intentionally empty. Reserved slot 005.
    NULL;
END $$;
