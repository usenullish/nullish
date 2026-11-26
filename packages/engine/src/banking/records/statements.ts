import type { Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbListArgs,
  DbListResult,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { EngineError } from "../../errors";

type SelectStatements = Records["Banking"]["Statements"]["Select"];
type InsertStatements = Records["Banking"]["Statements"]["Insert"];
type StatementsSortField = DbRecordsSortField<Db["Banking"]["Statements"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionStatements
  extends DbCollectionRecordsById<Db["Banking"]["Statements"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectStatements, InsertStatements, StatementsSortField>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Banking.Statements.StatementsSchema,
      foreignKeyColumn: DbSchema.Banking.Statements.StatementsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionStatements {
    return new this(args);
  }

  list(args: DbListArgs<StatementsSortField>): Promise<Result<DbListResult<SelectStatements>>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Banking.StatementsSchema.SelectStatementsSchema,
      ...args,
    });
  }

  async insert(_args: { values: InsertStatements }): Promise<Result<SelectStatements>> {
    return {
      status: "error",
      err: new EngineError("Inserting statements is not supported."),
    };
  }
}
