-- Materialized views can't have RLS policies attached to them in
-- Postgres, so authenticated_user must never query those
-- directly. Instead, authenticated_user can only see the alias view,
-- whose own WHERE clause restricts rows to the organizations the current user
-- actually belongs to.
REVOKE
SELECT
  ON ledger.mv_account_balances
FROM
  authenticated_user;
