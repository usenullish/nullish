-- A migration's provider never changes, and its user only becomes NULL when the user is deleted.
CREATE OR REPLACE FUNCTION migration.check_migrations_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.provider != OLD.provider THEN
    RAISE EXCEPTION 'provider cannot be changed once set (row %)', OLD.id;
END IF;

  IF NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed once set (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_migrations_immutable
BEFORE UPDATE ON migration.migrations FOR EACH ROW
EXECUTE FUNCTION migration.check_migrations_immutable ();
