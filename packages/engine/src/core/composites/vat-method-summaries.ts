import { DbUserContext } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { getColumns } from "drizzle-orm";
import type { DbCollectionStoreInitArgs, DbListArgs } from "../../store";
import { parseQueryArgs } from "../../_query/helpers";
import { listVatMethodSummaries } from "../_helpers/vat-method-summaries";

type VatMethodSummary = Composites["VatMethodSummaries"]["Select"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionVatMethodSummaries extends DbUserContext {
  readonly #organizationId: SelectOrganizations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Ledger.Periods.PeriodsSchema)) as [string, ...string[]],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super(args);

    this.#organizationId = args.foreignKeyId;
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionVatMethodSummaries {
    return new this(args);
  }

  list({ pagination, sort }: DbListArgs<string>): Promise<Result<VatMethodSummary[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: DbSchema.Ledger.Periods.PeriodsSchema,
        pKey: DbSchema.Core.Vat.VatMethodsSchema.id,
      });

      return await this._withAuth<VatMethodSummary[]>(
        async (tx) =>
          await listVatMethodSummaries({ tx, organizationId: this.#organizationId, ...queryArgs }),
      );
    });
  }
}
