import { DbUserContext, type DbUserContextArgs } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import { type Reports, ReportsSchema } from "@usenullish/nullish-schema/reports";
import { listActiveAccountIds } from "../_helpers/active-accounts";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];

export type ActiveAccountsReportArgs = DbUserContextArgs & {
  organizationId: OrganizationId;
};

export class ActiveAccountsReport extends DbUserContext {
  readonly #organizationId: OrganizationId;

  private constructor({ organizationId, ...rest }: ActiveAccountsReportArgs) {
    super(rest);

    this.#organizationId = organizationId;
  }

  static create(args: ActiveAccountsReportArgs): ActiveAccountsReport {
    return new this(args);
  }

  list(
    args: Reports["Ledger"]["Args"],
  ): Promise<Result<Reports["Ledger"]["ActiveAccountIds"]["Result"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const ledgerArgs = ReportsSchema.LedgerSchema.LedgerReportArgsSchema.parse(args);

        return await listActiveAccountIds({
          tx,
          organizationId: this.#organizationId,
          ...ledgerArgs,
        });
      });
    });
  }
}
