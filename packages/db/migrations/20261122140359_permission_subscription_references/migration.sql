-- The references link a subscription to the payment provider. Users have no
-- use for them, only the admin tooling reads and writes them. The subscription
-- schema grants SELECT on its tables to users, so it is taken back here.
-- In other words, only the system reads and writes the references to Stripe.
REVOKE
SELECT
  ON subscription.subscription_references
FROM
  authenticated_user;
