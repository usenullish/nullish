-- Session-variable helpers for Row-Level Security (RLS) org scoping.
--
-- Pattern: standard Postgres multi-tenant RLS approach, a custom GUC
-- (app.current_user_id) set per-transaction, read back by RLS policies
-- via current_setting(). See:
--   https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET
--   https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/
--   https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres
--   https://oneuptime.com/blog/post/2026-01-25-row-level-security-postgresql/view
--   https://zenn.dev/azuma317/articles/drizzle-supabase-rls-monorepo?locale=en
--   https://theroadtoenterprise.com/blog/postgres-rls-multi-tenant-saas
-- Reads the current caller's user id from the session. Returns NULL if
-- unset or empty (fails safe: RLS policies comparing against NULL match
-- nothing, denying access by default), or if current_setting itself
-- raises for any other reason.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.current_user_id () RETURNS text AS $$
BEGIN
RETURN NULLIF(current_setting('app.current_user_id', true), '');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Sets the current caller's user id for the rest of the CURRENT
-- TRANSACTION only (is_local = true, equivalent to SET LOCAL). Must be
-- called inside the same transaction as the queries it should scope.
-- Never use is_local = false here: that persists across the whole
-- session, which leaks across requests when connections are pooled.
CREATE OR REPLACE FUNCTION auth.set_current_user_id (p_user_id text) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id, true);
END;
$$ LANGUAGE plpgsql;
