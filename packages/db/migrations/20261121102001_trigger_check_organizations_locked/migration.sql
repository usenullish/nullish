-- An organization whose subscription is not valid can only be deleted: the
-- only change allowed is setting deleted_at. Its other columns are compared
-- before and after the update, a policy only sees the row after it.
CREATE OR REPLACE FUNCTION core.check_organizations_locked () RETURNS TRIGGER AS $$
BEGIN
  IF NOT subscription.organization_subscription_is_valid(OLD.id)
    AND (to_jsonb(NEW) - 'deleted_at' - 'updated_at' - 'version')
      IS DISTINCT FROM (to_jsonb(OLD) - 'deleted_at' - 'updated_at' - 'version') THEN
    RAISE EXCEPTION 'Organization % is locked: it can only be deleted', OLD.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_organizations_locked
BEFORE UPDATE ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.check_organizations_locked ();
