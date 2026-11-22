-- Checks if an organization is not deleted, i.e. if its deletion date is not
-- set or has not passed yet. Until then it stays editable, even when its
-- deletion is already scheduled (e.g. at the end of its paid subscription).
--
-- It is a function because the same check is needed in several places: the
-- policies that make the organization's data read-only, and the functions to
-- join or leave an organization. Writing it once keeps them in sync.
--
-- Note: It takes the deletion date instead of the organization's ID because one of
-- the policies using it is on core.organizations itself, and a policy cannot
-- query its own table.
CREATE OR REPLACE FUNCTION core.organization_is_not_deleted (p_deleted_at timestamptz) RETURNS boolean AS $$
  SELECT p_deleted_at IS NULL OR p_deleted_at > now();
$$ LANGUAGE sql STABLE;
