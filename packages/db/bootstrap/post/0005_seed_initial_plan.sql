-- Seeds the plan new organizations get by default. It has no trial, so their
-- subscriptions never end, which is what a self-hosted instance needs.
INSERT INTO
  subscription.plans (provider, trial_days)
VALUES
  ('self', NULL);
