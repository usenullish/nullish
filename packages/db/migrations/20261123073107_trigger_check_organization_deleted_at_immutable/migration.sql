-- The deletion of an organization is final: once deleted_at is set, possibly to
-- a date still to come (the end of its paid subscription), it can no longer be
-- changed nor cleared.
--
-- In other words, the organization and all its data stay
-- editable until deleted_at, and become read-only once that date has passed,
-- the organization itself included.
CREATE OR REPLACE FUNCTION core.check_organization_deleted_at_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'The deletion of organization % is already scheduled', OLD.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_organization_deleted_at_immutable
BEFORE UPDATE OF deleted_at ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.check_organization_deleted_at_immutable ();
