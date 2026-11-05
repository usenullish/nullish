-- A succeeded migration cannot be deleted: it is kept as the history of how the organization's
-- data got there. A draft or a failed migration imported nothing and can be deleted.
CREATE OR REPLACE FUNCTION migration.check_migration_deletable_unless_succeeded () RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF OLD.status = 'succeeded' THEN
    RAISE EXCEPTION 'Migration % is % and cannot be deleted', OLD.id, OLD.status;
END IF;

RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_migration_deletable_unless_succeeded
BEFORE DELETE ON migration.migrations FOR EACH ROW
EXECUTE FUNCTION migration.check_migration_deletable_unless_succeeded ();
