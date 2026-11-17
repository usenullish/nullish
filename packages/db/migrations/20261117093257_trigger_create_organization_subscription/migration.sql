-- When a new organization is created, we create its subscription: active, on
-- the initial claim of the subscription settings, ending after the trial of
-- that claim, or without end when the claim has no trial.
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because users can only read the subscriptions, never write them.
CREATE OR REPLACE FUNCTION subscription.seed_subscription_for_organization () RETURNS TRIGGER AS $$
BEGIN
INSERT INTO subscription.subscriptions (organization_id, claim_id, status, period_end)
SELECT NEW.id, c.id, 'active',
  CASE WHEN c.trial_days IS NULL THEN NULL ELSE now() + make_interval(days => c.trial_days) END
FROM subscription.subscription_settings s
JOIN subscription.claims c ON c.id = s.initial_claim_id;

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

CREATE TRIGGER seed_subscription_on_organization_created
AFTER INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION subscription.seed_subscription_for_organization ();
