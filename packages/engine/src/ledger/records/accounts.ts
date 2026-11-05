import { nonNullish, notEmptyString, type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbMaterializedView, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbDeletableStore,
  DbListArgs,
  DbStore,
  DbStoreInitArgs,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { and, eq, or } from "drizzle-orm";
import { ilikeContains } from "../../_query/helpers";

type SelectAccounts = Records["Ledger"]["Accounts"]["Select"];
type InsertAccounts = Records["Ledger"]["Accounts"]["Insert"];
type UpdateAccounts = Records["Ledger"]["Accounts"]["Update"];

type AccountsSortField = DbRecordsSortField<Db["Ledger"]["Accounts"]>;
type FilterAccounts = Records["Ledger"]["Accounts"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbAccounts
  extends DbRecordsById<Db["Ledger"]["Accounts"]>
  implements
    DbStore<SelectAccounts, SelectAccounts["id"], UpdateAccounts>,
    DbDeletableStore<SelectAccounts, SelectAccounts["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Ledger.Accounts.AccountsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbAccounts {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectAccounts["id"] }): Promise<Result<Option<SelectAccounts>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema,
    });
  }

  delete({ pKey: id }: { pKey: SelectAccounts["id"] }): Promise<Result<Option<SelectAccounts>>> {
    return this._withRefresh({
      view: DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView,
      fn: () =>
        this._deleteAndReturnOneById({
          id,
          returningSchema: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema,
        }),
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateAccounts, "version"> & Partial<Omit<UpdateAccounts, "version">>;
    pKey: SelectAccounts["id"];
  }): Promise<Result<SelectAccounts>> {
    return this._withRefresh({
      view: DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView,
      fn: () =>
        this._updateAndReturnOneById({
          id,
          values,
          returningSchema: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema,
        }),
    });
  }
}

export class DbCollectionAccounts
  extends DbCollectionRecordsById<Db["Ledger"]["Accounts"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectAccounts, InsertAccounts, AccountsSortField, FilterAccounts>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Ledger.Accounts.AccountsSchema,
      foreignKeyColumn: DbSchema.Ledger.Accounts.AccountsSchema.organizationId,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>): DbCollectionAccounts {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<AccountsSortField, FilterAccounts>): Promise<Result<SelectAccounts[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Ledger.AccountsSchema.FilterAccountsSchema,
        where: ({ type, parentId, search }) =>
          and(
            nonNullish(type) ? eq(this._table.type, type) : undefined,
            nonNullish(parentId) ? eq(this._table.parentId, parentId) : undefined,
            notEmptyString(search)
              ? or(
                  ilikeContains({ column: this._table.code, value: search }),
                  ilikeContains({ column: this._table.name, value: search }),
                )
              : undefined,
          ),
      },
    });
  }

  insert({ values }: { values: InsertAccounts }): Promise<Result<SelectAccounts>> {
    return this._withRefresh({
      view: DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView,
      fn: () =>
        this.__insertWithForeignKeyId({
          values,
          returningSchema: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema,
        }),
    });
  }
}
