-- When a new organization is created, we create its subscription on the initial
-- claim of the subscription settings: trialing until the end of the trial of
-- that claim, or active without end when the claim has no trial.
--
-- It runs before the organization is inserted, so that the subscription
-- already exists when the other organization creation triggers run. The
-- foreign key to the organization is deferred for that reason
-- (20261117102251_rule_subscriptions_organization_deferred).
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because users can only read the subscriptions, never write them.
CREATE OR REPLACE FUNCTION subscription.seed_subscription_for_organization () RETURNS TRIGGER AS $$
BEGIN
INSERT INTO subscription.subscriptions (organization_id, claim_id, status, period_end)
SELECT NEW.id, c.id,
  (CASE WHEN c.trial_days IS NULL THEN 'active' ELSE 'trialing' END)::subscription.subscription_status,
  CASE WHEN c.trial_days IS NULL THEN NULL ELSE now() + make_interval(days => c.trial_days) END
FROM subscription.subscription_settings s
JOIN subscription.claims c ON c.id = s.initial_claim_id;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER seed_subscription_on_organization_created
BEFORE INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION subscription.seed_subscription_for_organization ();
