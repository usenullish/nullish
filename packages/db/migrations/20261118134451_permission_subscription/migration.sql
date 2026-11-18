-- Users can read the claims and the subscriptions, never write them: only the
-- database (triggers) and the admin tooling change them. Granting SELECT only,
-- like the templates and the metering, keeps them read-only even if a policy
-- were too permissive.
GRANT USAGE ON SCHEMA subscription TO authenticated_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA subscription
GRANT
SELECT
  ON TABLES TO authenticated_user;

GRANT
SELECT
  ON ALL TABLES IN SCHEMA subscription TO authenticated_user;
