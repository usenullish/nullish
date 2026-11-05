import { DbUserContext } from "@usenullish/nullish-db";
import { isArrayAtLeastOne, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { getColumns } from "drizzle-orm";
import type { DbCollectionStoreInitArgs, DbListArgs } from "../../store";
import { listBankRelations } from "../../core/_helpers/bank-relations";
import { countUnreconciledMovements } from "../_helpers/movements";
import { listLatestClosingBalances } from "../_helpers/statements";
import { parseQueryArgs } from "../../_query/helpers";

type BankRelationSummary = Composites["BankRelationSummaries"]["Select"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionBankRelationSummaries extends DbUserContext {
  readonly #organizationId: SelectOrganizations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Core.Bank.BankRelationsSchema)) as [string, ...string[]],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super(args);

    this.#organizationId = args.foreignKeyId;
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionBankRelationSummaries {
    return new this(args);
  }

  list({ pagination, sort }: DbListArgs<string>): Promise<Result<BankRelationSummary[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: DbSchema.Core.Bank.BankRelationsSchema,
        pKey: DbSchema.Core.Bank.BankRelationsSchema.id,
      });

      return await this._withAuth<BankRelationSummary[]>(async (tx) => {
        const bankRelations = await listBankRelations({
          tx,
          organizationId: this.#organizationId,
          ...queryArgs,
        });

        const bankRelationIds = bankRelations.map(({ id }) => id);

        if (!isArrayAtLeastOne(bankRelationIds)) {
          return [];
        }

        const unreconciled = await countUnreconciledMovements({ tx, bankRelationIds });
        const balances = await listLatestClosingBalances({ tx, bankRelationIds });

        return bankRelations.map((bankRelation) =>
          CompositesSchema.BankRelationSummariesSchema.SelectBankRelationSummariesSchema.parse({
            bankRelation,
            movements: { unreconciled: unreconciled.get(bankRelation.id) ?? 0 },
            balance: balances.get(bankRelation.id) ?? null,
          }),
        );
      });
    });
  }
}
