-- The providers hold the settings of the payment providers (e.g. the tax rate).
-- Users have no use for them, only the admin tooling reads and writes them. The
-- subscription schema grants SELECT on its tables to users, so it is taken back here.
REVOKE
SELECT
  ON subscription.subscription_providers
FROM
  authenticated_user;
