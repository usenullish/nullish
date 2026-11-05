-- An organization always keeps at least one admin: the last admin can
-- neither be removed nor given another role.
--
-- The organization row is locked so that two admins removing or demoting
-- each other at the same time cannot both pass the check.
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because a user can only read their own membership, and the check
-- needs to count all the admins of the organization.
CREATE OR REPLACE FUNCTION core.check_memberships_last_admin () RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF OLD.role <> 'admin' THEN
    RETURN COALESCE(NEW, OLD);
END IF;

  IF TG_OP = 'UPDATE' AND NEW.role = 'admin' THEN
    RETURN NEW;
END IF;

  PERFORM 1 FROM core.organizations WHERE id = OLD.organization_id FOR NO KEY UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM core.memberships
    WHERE organization_id = OLD.organization_id
      AND role = 'admin'
      AND id <> OLD.id
  ) THEN
    RAISE EXCEPTION 'An organization needs at least one admin'
      USING ERRCODE = 'R0001';
END IF;

RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER enforce_memberships_last_admin
BEFORE UPDATE OR DELETE ON core.memberships FOR EACH ROW
EXECUTE FUNCTION core.check_memberships_last_admin ();
