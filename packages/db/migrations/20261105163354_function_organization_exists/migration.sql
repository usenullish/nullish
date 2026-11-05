-- Whether the organization still exists. Used by the triggers that protect
-- the records of an organization, which let the deletion of the organization
-- itself remove them.
CREATE OR REPLACE FUNCTION core.organization_exists (p_organization_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.organizations WHERE id = p_organization_id
  );
$$ LANGUAGE sql;
