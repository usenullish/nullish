import { type Result } from "@usenullish/nullish-common";
import { ViewsSchema } from "@usenullish/nullish-schema/views";
import { DbLedgerReports, type DbLedgerReportsArgs, type LedgerView } from "./_ledger-reports";
import { type Db, DbView } from "@usenullish/nullish-schema/db";
import type { Reports } from "@usenullish/nullish-schema/reports";

export class BalanceSheetReport extends DbLedgerReports<Db["Ledger"]["BalanceSheet"] & LedgerView> {
  private constructor(args: DbLedgerReportsArgs) {
    super({
      ...args,
      view: DbView.Ledger.BalanceSheet.BalanceSheetView,
    });
  }

  static create(args: DbLedgerReportsArgs): BalanceSheetReport {
    return new this(args);
  }

  async list(
    args: Reports["Ledger"]["Args"],
  ): Promise<Result<Reports["Ledger"]["BalanceSheet"]["Result"]>> {
    return this._list({
      ...args,
      schema: ViewsSchema.Ledger.BalanceSheetView.SelectBalanceSheetView,
    });
  }
}
