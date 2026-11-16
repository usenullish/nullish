-- When a new organization is created, we create its subscription, with the
-- status set by the organization rules of the instance: active (usable right
-- away, without end) or pending (locked until a subscription is paid).
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because users can neither write the subscriptions nor read the
-- organization rules.
CREATE OR REPLACE FUNCTION core.seed_subscription_for_organization () RETURNS TRIGGER AS $$
BEGIN
INSERT INTO core.subscriptions (organization_id, status)
SELECT NEW.id, r.initial_subscription_status
FROM instance.organization_rules r;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER seed_subscription_on_organization_created
AFTER INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.seed_subscription_for_organization ();
