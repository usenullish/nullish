-- The tax rates link a period to a tax rate of the payment provider. Users have
-- no use for them, only the admin tooling reads and writes them. The subscription
-- schema grants SELECT on its tables to users, so it is taken back here.
REVOKE
SELECT
  ON subscription.subscription_tax_rates
FROM
  authenticated_user;
