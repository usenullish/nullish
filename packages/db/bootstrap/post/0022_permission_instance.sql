-- Users can read the instance rules, never write them: only the admin tooling
-- changes them. Granting SELECT only, like the subscriptions, the templates and
-- the metering, keeps them read-only even if a policy were too permissive.
GRANT USAGE ON SCHEMA instance TO authenticated_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA instance
GRANT
SELECT
  ON TABLES TO authenticated_user;

GRANT
SELECT
  ON ALL TABLES IN SCHEMA instance TO authenticated_user;
