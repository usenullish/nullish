import type { Option, Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStoreInitArgs,
  DbStoreInitArgs,
  DbCollectionStore,
  DbStore,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import type { QueryArgs } from "@usenullish/nullish-schema/db";

type SelectAccountingSettings = Records["Core"]["AccountingSettings"]["Select"];
type InsertAccountingSettings = Records["Core"]["AccountingSettings"]["Insert"];
type UpdateAccountingSettings = Records["Core"]["AccountingSettings"]["Update"];
type AccountingSettingsSortField = DbRecordsSortField<Db["Core"]["AccountingSettings"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbAccountingSettings
  extends DbRecordsById<Db["Core"]["AccountingSettings"]>
  implements
    DbStore<SelectAccountingSettings, SelectAccountingSettings["id"], UpdateAccountingSettings>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Accounting.AccountingSettingsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbAccountingSettings {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectAccountingSettings["id"];
  }): Promise<Result<Option<SelectAccountingSettings>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateAccountingSettings, "version"> &
      Partial<Omit<UpdateAccountingSettings, "version">>;
    pKey: SelectAccountingSettings["id"];
  }): Promise<Result<SelectAccountingSettings>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema,
    });
  }
}

export class DbCollectionAccountingSettings
  extends DbCollectionRecordsById<Db["Core"]["AccountingSettings"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectAccountingSettings, InsertAccountingSettings>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Accounting.AccountingSettingsSchema,
      foreignKeyColumn: DbSchema.Core.Accounting.AccountingSettingsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionAccountingSettings {
    return new this(args);
  }

  list(args: QueryArgs<AccountingSettingsSortField>): Promise<Result<SelectAccountingSettings[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema,
      ...args,
    });
  }

  insert({
    values,
  }: {
    values: InsertAccountingSettings;
  }): Promise<Result<SelectAccountingSettings>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema,
    });
  }
}
