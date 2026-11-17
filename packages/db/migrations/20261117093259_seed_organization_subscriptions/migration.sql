-- Migration for existing organization before subscriptions existed.
--
-- Gives a subscription, active and without end, to every organization that
-- already exists. New organizations get theirs from
-- 20261117093257_trigger_create_organization_subscription.
INSERT INTO
  subscription.subscriptions (organization_id, claim_id, status)
SELECT
  o.id,
  s.initial_claim_id,
  'active'
FROM
  core.organizations o
  CROSS JOIN subscription.subscription_settings s
ON CONFLICT (organization_id) DO NOTHING;
