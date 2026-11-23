-- An organization cannot have more members than the rules of its plan allow
-- (plan_rules.max_members). A plan without rules has no limit.
--
-- ⚠️ SECURITY DEFINER: an admin adding a member only sees their own
-- membership, so the count would be wrong with their rights.
CREATE OR REPLACE FUNCTION core.check_organization_max_members () RETURNS TRIGGER AS $$
DECLARE
v_max_members integer;
v_count integer;
BEGIN
SELECT r.max_members INTO v_max_members
FROM subscription.subscriptions s
         JOIN subscription.plans p ON p.id = s.plan_id
         JOIN subscription.plan_rules r ON r.id = p.plan_rules_id
WHERE s.organization_id = NEW.organization_id;

IF v_max_members IS NULL THEN
    RETURN NEW;
END IF;

SELECT count(*) INTO v_count
FROM core.memberships m
WHERE m.organization_id = NEW.organization_id;

IF v_count >= v_max_members THEN
    RAISE EXCEPTION 'Organization % has reached its limit of % members', NEW.organization_id, v_max_members
      USING ERRCODE = 'R0001';
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER enforce_memberships_max_members
BEFORE INSERT ON core.memberships FOR EACH ROW
EXECUTE FUNCTION core.check_organization_max_members ();
