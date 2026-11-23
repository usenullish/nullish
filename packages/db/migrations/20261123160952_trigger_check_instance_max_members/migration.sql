-- An instance cannot have more members than its rules allow
-- (instance_rules.max_members). Without rules, or without a maximum, it has no
-- limit. A member is a person: someone who belongs to several organizations
-- takes a single seat, so joining another organization is always allowed.
--
-- ⚠️ SECURITY DEFINER: a user only sees their own memberships, so the count
-- would be wrong with the user's rights.
CREATE OR REPLACE FUNCTION instance.check_instance_max_members () RETURNS TRIGGER AS $$
DECLARE
v_max_members integer;
v_count integer;
BEGIN
  SELECT r.max_members INTO v_max_members
  FROM instance.instance_rules r;

  IF v_max_members IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM core.memberships m
    WHERE m.user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT m.user_id) INTO v_count
  FROM core.memberships m;

  IF v_count >= v_max_members THEN
    RAISE EXCEPTION 'This instance has reached its limit of % members', v_max_members
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER enforce_instance_max_members
BEFORE INSERT ON core.memberships FOR EACH ROW
EXECUTE FUNCTION instance.check_instance_max_members ();
