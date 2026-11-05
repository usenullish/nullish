-- Create index for materialized views because drizzle does not generate indexes
-- if provided as a standalone variable
-- e.g. export const AccountBalancesMvIdx = uniqueIndex("mv_account_balances_org_period_account_uidx").on(AccountBalancesMv.organizationId, AccountBalancesMv.periodId, AccountBalancesMv.accountId);
-- nor support specifying it in materializedView() https://github.com/drizzle-team/drizzle-orm/issues/2976
CREATE UNIQUE INDEX IF NOT EXISTS "mv_account_balances_org_period_account_uidx" ON "ledger"."mv_account_balances" ("organization_id", "period_id", "account_id");
