-- Every new migration must be created with status draft.
CREATE OR REPLACE FUNCTION migration.check_new_migration_is_draft () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'New migrations must be created with status draft';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_new_migration_is_draft
BEFORE INSERT ON migration.migrations FOR EACH ROW
EXECUTE FUNCTION migration.check_new_migration_is_draft ();
