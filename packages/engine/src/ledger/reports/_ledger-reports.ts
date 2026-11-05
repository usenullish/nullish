import type { AnyPgColumn, PgView } from "drizzle-orm/pg-core";
import { and, eq, getColumns } from "drizzle-orm";
import { castCurrencyValue } from "@usenullish/nullish-schema/db";
import { type Result } from "@usenullish/nullish-common";
import type * as z from "zod";
import { type DbReportArgs, DbReports } from "../../_reports/reports";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Reports } from "@usenullish/nullish-schema/reports";

export type LedgerView = PgView<string, boolean, Record<string, AnyPgColumn>> & {
  organizationId: AnyPgColumn;
  periodId: AnyPgColumn;
  totalDebit: AnyPgColumn;
  totalCredit: AnyPgColumn;
  balance: AnyPgColumn;
};

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export type DbLedgerReportsArgs = DbReportArgs & {
  organizationId: SelectOrganizations["id"];
};

export abstract class DbLedgerReports<TView extends LedgerView> extends DbReports<TView> {
  #organizationId: SelectOrganizations["id"];

  protected constructor({
    organizationId,
    ...rest
  }: DbLedgerReportsArgs & {
    view: TView;
  }) {
    super(rest);

    this.#organizationId = organizationId;
  }

  protected async _list<T>({
    schema,
    periodId,
  }: {
    schema: z.ZodType<T>;
  } & Reports["Ledger"]["Args"]): Promise<Result<T[]>> {
    return await this._query({
      schema,
      where: and(
        eq(this._view.organizationId, this.#organizationId),
        eq(this._view.periodId, periodId),
      ),
      selection: {
        ...getColumns(this._view),
        totalDebit: castCurrencyValue(this._view.totalDebit).as("total_debit"),
        totalCredit: castCurrencyValue(this._view.totalCredit).as("total_credit"),
        balance: castCurrencyValue(this._view.balance).as("balance"),
      },
    });
  }
}
