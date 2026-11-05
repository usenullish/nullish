-- Migration datasets can only be added, updated or removed while the parent migration is still a draft.
CREATE OR REPLACE FUNCTION migration.check_dataset_editable () RETURNS TRIGGER AS $$
DECLARE
migration_status migration.migration_status;
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

SELECT status INTO migration_status
FROM migration.migrations
WHERE id = COALESCE(NEW.migration_id, OLD.migration_id);

IF migration_status != 'draft' THEN
    RAISE EXCEPTION 'Migration % is % and its datasets cannot be modified',
      COALESCE(NEW.migration_id, OLD.migration_id), migration_status;
END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_dataset_editable
BEFORE INSERT OR UPDATE OR DELETE ON migration.datasets FOR EACH ROW
EXECUTE FUNCTION migration.check_dataset_editable ();
