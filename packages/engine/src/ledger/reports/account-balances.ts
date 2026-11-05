import { type Result } from "@usenullish/nullish-common";
import { ViewsSchema } from "@usenullish/nullish-schema/views";
import type { Reports } from "@usenullish/nullish-schema/reports";
import { DbLedgerReports, type DbLedgerReportsArgs, type LedgerView } from "./_ledger-reports";
import { type Db, DbView } from "@usenullish/nullish-schema/db";

export class AccountBalancesReport extends DbLedgerReports<
  Db["Ledger"]["AccountBalances"] & LedgerView
> {
  private constructor(args: DbLedgerReportsArgs) {
    super({
      ...args,
      view: DbView.Ledger.AccountBalances.AccountBalancesView,
    });
  }

  static create(args: DbLedgerReportsArgs): AccountBalancesReport {
    return new this(args);
  }

  async list(
    args: Reports["Ledger"]["Args"],
  ): Promise<Result<Reports["Ledger"]["AccountBalances"]["Result"]>> {
    return this._list({
      ...args,
      schema: ViewsSchema.Ledger.AccountBalancesView.SelectAccountBalancesView,
    });
  }
}
