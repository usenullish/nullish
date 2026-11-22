-- An organization can only be deleted for good once its deletion date has
-- passed. Until then, it stays editable and must be kept.
CREATE OR REPLACE FUNCTION core.check_organization_deletable () RETURNS TRIGGER AS $$
BEGIN
  IF core.organization_is_not_deleted(OLD.deleted_at) THEN
    RAISE EXCEPTION 'Organization % is not deleted yet', OLD.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_organization_deletable
BEFORE DELETE ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.check_organization_deletable ();
