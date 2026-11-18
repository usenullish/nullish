-- Seeds the claim new organizations get by default. It has no trial, so their
-- subscriptions never end, which is what a self-hosted instance needs.
INSERT INTO
  subscription.claims (trial_days)
VALUES
  (NULL);
