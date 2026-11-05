-- Enforces the migration status transitions: draft -> succeeded/failed, failed -> succeeded/failed.
-- Succeeded and failed are terminal.
CREATE OR REPLACE FUNCTION migration.check_migration_status_transition () RETURNS TRIGGER AS $$
BEGIN
  IF NOT (
    (OLD.status IN ('draft', 'failed') AND NEW.status IN ('succeeded', 'failed')) OR
    (OLD.status = NEW.status)
  ) THEN
    RAISE EXCEPTION 'Invalid migration status transition: % -> %', OLD.status, NEW.status;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_migration_status_transition
BEFORE UPDATE ON migration.migrations FOR EACH ROW
EXECUTE FUNCTION migration.check_migration_status_transition ();
