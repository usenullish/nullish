-- Creates the first membership (admin) for a brand-new organization.
-- Any authenticated user can create an organization, becoming its admin,
-- resolving the chicken-and-egg problem: memberships are scoped tightly
-- to orgs, so no membership can exist for an org that doesn't exist yet.
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because only an admin of an organization may add its members and a
-- new organization has none yet.
CREATE OR REPLACE FUNCTION core.bootstrap_organization_admin () RETURNS TRIGGER AS $$
DECLARE
v_user_id text := auth.current_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
END IF;

INSERT INTO core.memberships (organization_id, user_id, role)
VALUES (NEW.id, v_user_id, 'admin');

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER bootstrap_organization_admin_trigger
AFTER INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.bootstrap_organization_admin ();
