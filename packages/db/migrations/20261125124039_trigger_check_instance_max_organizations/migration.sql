-- An instance cannot have more organizations than its rules allow
-- (instance_rules.max_organizations). Without rules, or without a maximum, it
-- has no limit. An organization marked as deleted still counts until it is
-- deleted for good.
--
-- ⚠️ SECURITY DEFINER: a user only sees the organizations they are a member
-- of, so the count would be wrong with the user's rights.
CREATE OR REPLACE FUNCTION instance.check_instance_max_organizations () RETURNS TRIGGER AS $$
DECLARE
v_max_organizations integer;
v_count integer;
BEGIN
  SELECT r.max_organizations INTO v_max_organizations
  FROM instance.instance_rules r;

  IF v_max_organizations IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM core.organizations o;

  IF v_count >= v_max_organizations THEN
    RAISE EXCEPTION 'This instance has reached its limit of % organizations', v_max_organizations
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER enforce_instance_max_organizations
BEFORE INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION instance.check_instance_max_organizations ();
