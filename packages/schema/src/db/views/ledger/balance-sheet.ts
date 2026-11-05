import { LedgerSchema } from "../../schemas";
import { and, inArray, sql } from "drizzle-orm";
import { BALANCE_SHEET_ACCOUNT_TYPES } from "../../constants/accounts";
import { AccountBalancesMaterializedView } from "../../materialized-views/ledger/account-balances";
import { userBelongsToOrg } from "../../schemas/_policies";

// = Bilan
export const BalanceSheetView = LedgerSchema.view("balance_sheet")
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
          inArray(AccountBalancesMaterializedView.type, BALANCE_SHEET_ACCOUNT_TYPES),
          sql`${AccountBalancesMaterializedView.balance} != 0`,
        ),
      )
      .orderBy(AccountBalancesMaterializedView.code),
  );
