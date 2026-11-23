-- An organization cannot have more members than the rules of its plan allow
-- (plan_rules.max_members). A plan without rules has no limit.
--
-- Inviting counts the members and the pending invitations, so that a batch of
-- invitations cannot go beyond the limit once accepted. Accepting counts the
-- members only, its own invitation was already counted when it was created.
--
-- ⚠️ SECURITY DEFINER: the admin who invites only sees their own membership,
-- so the count would be wrong with the user's rights.
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

  -- A pending invitation already takes a seat: otherwise an admin could invite
  -- more people than the plan allows, and the last ones would only find out it
  -- is full when they accept. Expired invitations can no longer be accepted, so
  -- they don't count.
  IF TG_TABLE_NAME = 'invitations' THEN
    v_count := v_count + (
      SELECT count(*)
      FROM core.invitations i
      WHERE i.organization_id = NEW.organization_id
        AND i.expires_at > now()
    );
  END IF;

  IF v_count >= v_max_members THEN
    RAISE EXCEPTION 'Organization % has reached its limit of % members', NEW.organization_id, v_max_members
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER enforce_invitations_max_members
BEFORE INSERT ON core.invitations FOR EACH ROW
EXECUTE FUNCTION core.check_organization_max_members ();

CREATE TRIGGER enforce_memberships_max_members
BEFORE INSERT ON core.memberships FOR EACH ROW
EXECUTE FUNCTION core.check_organization_max_members ();
