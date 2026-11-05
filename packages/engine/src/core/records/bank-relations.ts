import type { Option, Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbDeletableStore,
  DbStore,
  DbStoreInitArgs,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import type { QueryArgs } from "@usenullish/nullish-schema/db";

type SelectBankRelations = Records["Core"]["BankRelations"]["Select"];
type InsertBankRelations = Records["Core"]["BankRelations"]["Insert"];
type UpdateBankRelations = Records["Core"]["BankRelations"]["Update"];
type BankRelationsSortField = DbRecordsSortField<Db["Core"]["BankRelations"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbBankRelations
  extends DbRecordsById<Db["Core"]["BankRelations"]>
  implements
    DbStore<SelectBankRelations, SelectBankRelations["id"], UpdateBankRelations>,
    DbDeletableStore<SelectBankRelations, SelectBankRelations["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Bank.BankRelationsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbBankRelations {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectBankRelations["id"];
  }): Promise<Result<Option<SelectBankRelations>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
    });
  }

  delete({
    pKey: id,
  }: {
    pKey: SelectBankRelations["id"];
  }): Promise<Result<Option<SelectBankRelations>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateBankRelations, "version"> & Partial<Omit<UpdateBankRelations, "version">>;
    pKey: SelectBankRelations["id"];
  }): Promise<Result<SelectBankRelations>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
    });
  }
}

export class DbCollectionBankRelations
  extends DbCollectionRecordsById<Db["Core"]["BankRelations"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectBankRelations, InsertBankRelations>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Bank.BankRelationsSchema,
      foreignKeyColumn: DbSchema.Core.Bank.BankRelationsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionBankRelations {
    return new this(args);
  }

  list(args: QueryArgs<BankRelationsSortField>): Promise<Result<SelectBankRelations[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
      ...args,
    });
  }

  insert({ values }: { values: InsertBankRelations }): Promise<Result<SelectBankRelations>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
    });
  }
}
