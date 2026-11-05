-- A dataset can be replaced while its migration is a draft, but it stays the dataset of the same
-- migration and of the same type.
CREATE OR REPLACE FUNCTION migration.check_datasets_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.migration_id IS DISTINCT FROM OLD.migration_id OR NEW.type IS DISTINCT FROM OLD.type THEN
    RAISE EXCEPTION 'The migration and the type of dataset % cannot be modified', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_datasets_immutable
BEFORE UPDATE ON migration.datasets FOR EACH ROW
EXECUTE FUNCTION migration.check_datasets_immutable ();
