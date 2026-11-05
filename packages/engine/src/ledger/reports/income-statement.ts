import { type Result } from "@usenullish/nullish-common";
import { ViewsSchema } from "@usenullish/nullish-schema/views";
import { DbLedgerReports, type DbLedgerReportsArgs, type LedgerView } from "./_ledger-reports";
import { type Db, DbView } from "@usenullish/nullish-schema/db";
import type { Reports } from "@usenullish/nullish-schema/reports";

export class IncomeStatementReport extends DbLedgerReports<
  Db["Ledger"]["IncomeStatement"] & LedgerView
> {
  private constructor(args: DbLedgerReportsArgs) {
    super({
      ...args,
      view: DbView.Ledger.IncomeStatement.IncomeStatementView,
    });
  }

  static create(args: DbLedgerReportsArgs): IncomeStatementReport {
    return new this(args);
  }

  async list(
    args: Reports["Ledger"]["Args"],
  ): Promise<Result<Reports["Ledger"]["IncomeStatement"]["Result"]>> {
    return this._list({
      ...args,
      schema: ViewsSchema.Ledger.IncomeStatementView.SelectIncomeStatementView,
    });
  }
}
