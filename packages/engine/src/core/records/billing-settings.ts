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

type SelectBillingSettings = Records["Core"]["BillingSettings"]["Select"];
type InsertBillingSettings = Records["Core"]["BillingSettings"]["Insert"];
type UpdateBillingSettings = Records["Core"]["BillingSettings"]["Update"];
type BillingSettingsSortField = DbRecordsSortField<Db["Core"]["BillingSettings"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbBillingSettings
  extends DbRecordsById<Db["Core"]["BillingSettings"]>
  implements DbStore<SelectBillingSettings, SelectBillingSettings["id"], UpdateBillingSettings>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Billing.BillingSettingsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbBillingSettings {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectBillingSettings["id"];
  }): Promise<Result<Option<SelectBillingSettings>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.BillingSchema.SelectBillingSettingsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateBillingSettings, "version"> &
      Partial<Omit<UpdateBillingSettings, "version">>;
    pKey: SelectBillingSettings["id"];
  }): Promise<Result<SelectBillingSettings>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.BillingSchema.SelectBillingSettingsSchema,
    });
  }
}

export class DbCollectionBillingSettings
  extends DbCollectionRecordsById<Db["Core"]["BillingSettings"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectBillingSettings, InsertBillingSettings>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Billing.BillingSettingsSchema,
      foreignKeyColumn: DbSchema.Core.Billing.BillingSettingsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionBillingSettings {
    return new this(args);
  }

  list(args: QueryArgs<BillingSettingsSortField>): Promise<Result<SelectBillingSettings[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.BillingSchema.SelectBillingSettingsSchema,
      ...args,
    });
  }

  insert({ values }: { values: InsertBillingSettings }): Promise<Result<SelectBillingSettings>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.BillingSchema.SelectBillingSettingsSchema,
    });
  }
}
