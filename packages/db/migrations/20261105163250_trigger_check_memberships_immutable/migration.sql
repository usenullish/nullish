-- A membership always identifies one specific user in one specific
-- organization; changing either would reassign it to someone/somewhere
-- else entirely, only role is meant to change.
CREATE OR REPLACE FUNCTION core.check_memberships_user_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id != OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed once set (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_memberships_user_immutable
BEFORE UPDATE ON core.memberships FOR EACH ROW
EXECUTE FUNCTION core.check_memberships_user_immutable ();
