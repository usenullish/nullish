import { nonNullish, type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStoreInitArgs,
  DbStoreInitArgs,
  DbCollectionStore,
  DbStore,
  DbListArgs,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { and, eq } from "drizzle-orm";

type SelectSystemAccounts = Records["Ledger"]["SystemAccounts"]["Select"];
type InsertSystemAccounts = Records["Ledger"]["SystemAccounts"]["Insert"];
type UpdateSystemAccounts = Records["Ledger"]["SystemAccounts"]["Update"];

type SystemAccountsSortField = DbRecordsSortField<Db["Ledger"]["SystemAccounts"]>;
type FilterSystemAccounts = Records["Ledger"]["SystemAccounts"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbSystemAccounts
  extends DbRecordsById<Db["Ledger"]["SystemAccounts"]>
  implements DbStore<SelectSystemAccounts, SelectSystemAccounts["id"], UpdateSystemAccounts>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Ledger.SystemAccounts.SystemAccountsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbSystemAccounts {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectSystemAccounts["id"];
  }): Promise<Result<Option<SelectSystemAccounts>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateSystemAccounts, "version"> & Partial<Omit<UpdateSystemAccounts, "version">>;
    pKey: SelectSystemAccounts["id"];
  }): Promise<Result<SelectSystemAccounts>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema,
    });
  }
}

export class DbCollectionSystemAccounts
  extends DbCollectionRecordsById<Db["Ledger"]["SystemAccounts"], SelectOrganizations["id"]>
  implements
    DbCollectionStore<
      SelectSystemAccounts,
      InsertSystemAccounts,
      SystemAccountsSortField,
      FilterSystemAccounts
    >
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Ledger.SystemAccounts.SystemAccountsSchema,
      foreignKeyColumn: DbSchema.Ledger.SystemAccounts.SystemAccountsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionSystemAccounts {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<SystemAccountsSortField, FilterSystemAccounts>): Promise<
    Result<SelectSystemAccounts[]>
  > {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Ledger.SystemAccountsSchema.FilterSystemAccountsSchema,
        where: ({ purpose, accountId }) =>
          and(
            nonNullish(purpose) ? eq(this._table.purpose, purpose) : undefined,
            nonNullish(accountId) ? eq(this._table.accountId, accountId) : undefined,
          ),
      },
    });
  }

  insert({ values }: { values: InsertSystemAccounts }): Promise<Result<SelectSystemAccounts>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema,
    });
  }
}
