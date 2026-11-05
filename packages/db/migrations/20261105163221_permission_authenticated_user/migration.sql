-- Grants the app's own connecting role (the user of the DB url) membership
-- in authenticated_user, plus the table/schema
-- access and function EXECUTE rights that role needs at runtime.
GRANT authenticated_user TO CURRENT_USER;

GRANT USAGE ON SCHEMA core,
ledger,
billing,
banking,
templates,
auth,
metering,
chat,
migration,
audit TO authenticated_user;

-- Set DEFAULT privileges for future tables/views created by the schema owner
ALTER DEFAULT PRIVILEGES IN SCHEMA core,
ledger,
billing,
banking,
chat,
migration
GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON TABLES TO authenticated_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA templates
GRANT
SELECT
  ON TABLES TO authenticated_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA metering
GRANT
SELECT
  ON TABLES TO authenticated_user;

-- Grants for EXISTING tables/views
GRANT
SELECT
,
  INSERT,
UPDATE,
DELETE ON ALL TABLES IN SCHEMA core,
ledger,
billing,
banking,
chat,
migration TO authenticated_user;

GRANT
SELECT
  ON ALL TABLES IN SCHEMA templates TO authenticated_user;

GRANT
SELECT
  ON ALL TABLES IN SCHEMA metering TO authenticated_user;

GRANT
EXECUTE ON FUNCTION auth.current_user_id () TO authenticated_user;

GRANT
EXECUTE ON FUNCTION auth.set_current_user_id (text) TO authenticated_user;
