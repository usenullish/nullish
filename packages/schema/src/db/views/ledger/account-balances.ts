import { LedgerSchema } from "../../schemas";
import { userBelongsToOrg } from "../../schemas/_policies";
import { AccountBalancesMaterializedView } from "../../materialized-views/ledger/account-balances";

export const AccountBalancesView = LedgerSchema.view("account_balances")
  .with({ securityBarrier: true })
  .as((qb) =>
    qb
      .select()
      .from(AccountBalancesMaterializedView)
      .where(
        userBelongsToOrg({
          organizationId: AccountBalancesMaterializedView.organizationId,
        }),
      )
      .orderBy(AccountBalancesMaterializedView.code),
  );
