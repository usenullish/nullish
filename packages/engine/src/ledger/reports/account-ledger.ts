import { DbUserContext, type DbUserContextArgs } from "@usenullish/nullish-db";
import { isNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import { queryArgsSchema } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { type Reports, ReportsSchema } from "@usenullish/nullish-schema/reports";
import type { DbListArgs } from "../../store";
import { listAccountLedger, totalAccountLedger } from "../_helpers/account-ledger";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];
type AccountLedgerSortField = Reports["Ledger"]["AccountLedger"]["SortField"];

export type AccountLedgerReportArgs = DbUserContextArgs & {
  organizationId: OrganizationId;
};

export class AccountLedgerReport extends DbUserContext {
  readonly #organizationId: OrganizationId;
  readonly #queryArgsSchema = queryArgsSchema(
    ReportsSchema.LedgerSchema.AccountLedgerSortFieldSchema.options as [
      AccountLedgerSortField,
      ...AccountLedgerSortField[],
    ],
  );

  private constructor({ organizationId, ...rest }: AccountLedgerReportArgs) {
    super(rest);

    this.#organizationId = organizationId;
  }

  static create(args: AccountLedgerReportArgs): AccountLedgerReport {
    return new this(args);
  }

  list({
    filters,
    pagination,
    sort,
    ...args
  }: Reports["Ledger"]["AccountLedger"]["Args"] &
    DbListArgs<string, Reports["Ledger"]["AccountLedger"]["Filter"]>): Promise<
    Result<Reports["Ledger"]["AccountLedger"]["Report"]>
  > {
    return tryCatch(async () => {
      const ledgerArgs = ReportsSchema.LedgerSchema.AccountLedgerArgsSchema.parse(args);

      const queryArgs = this.#queryArgsSchema.parse({ pagination, sort });

      const parsedFilters = isNullish(filters)
        ? undefined
        : ReportsSchema.LedgerSchema.FilterAccountLedgerSchema.parse(filters);

      return await this._withAuth(async (tx) => {
        const postings = await listAccountLedger({
          tx,
          organizationId: this.#organizationId,
          ...ledgerArgs,
          ...queryArgs,
          filters: parsedFilters,
        });

        const totals = await totalAccountLedger({
          tx,
          organizationId: this.#organizationId,
          ...ledgerArgs,
          filters: parsedFilters,
        });

        return { postings, totals };
      });
    });
  }
}
