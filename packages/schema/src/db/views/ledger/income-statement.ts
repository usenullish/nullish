import { LedgerSchema } from "../../schemas";
import { and, inArray, sql } from "drizzle-orm";
import { INCOME_STATEMENT_ACCOUNT_TYPES } from "../../constants/accounts";
import { AccountBalancesMaterializedView } from "../../materialized-views/ledger/account-balances";
import { userBelongsToOrg } from "../../schemas/_policies";

// Pertes et Profits - Profit & Loss
export const IncomeStatementView = LedgerSchema.view("income_statement")
  .with({ securityBarrier: true })
  .as((qb) =>
    qb
      .select()
      .from(AccountBalancesMaterializedView)
      .where(
        and(
          userBelongsToOrg({
            organizationId: AccountBalancesMaterializedView.organizationId,
          }),
          inArray(AccountBalancesMaterializedView.type, INCOME_STATEMENT_ACCOUNT_TYPES),
          sql`${AccountBalancesMaterializedView.balance} != 0`,
        ),
      )
      .orderBy(AccountBalancesMaterializedView.code),
  );
