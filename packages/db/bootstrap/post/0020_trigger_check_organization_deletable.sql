-- An organization can only be deleted for good 30 days after its deletion
-- date. Until then, it stays editable and then read-only, and must be kept.
CREATE OR REPLACE FUNCTION core.check_organization_deletable () RETURNS TRIGGER AS $$
BEGIN
  IF OLD.deleted_at IS NULL OR OLD.deleted_at > now() - interval '30 days' THEN
    RAISE EXCEPTION 'Organization % cannot be deleted yet', OLD.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_organization_deletable
BEFORE DELETE ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.check_organization_deletable ();
