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

type SelectVatSettings = Records["Core"]["VatSettings"]["Select"];
type InsertVatSettings = Records["Core"]["VatSettings"]["Insert"];
type UpdateVatSettings = Records["Core"]["VatSettings"]["Update"];
type VatSettingsSortField = DbRecordsSortField<Db["Core"]["VatSettings"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbVatSettings
  extends DbRecordsById<Db["Core"]["VatSettings"]>
  implements DbStore<SelectVatSettings, SelectVatSettings["id"], UpdateVatSettings>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Vat.VatSettingsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbVatSettings {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectVatSettings["id"];
  }): Promise<Result<Option<SelectVatSettings>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.VatSchema.SelectVatSettingsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateVatSettings, "version"> & Partial<Omit<UpdateVatSettings, "version">>;
    pKey: SelectVatSettings["id"];
  }): Promise<Result<SelectVatSettings>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.VatSchema.SelectVatSettingsSchema,
    });
  }
}

export class DbCollectionVatSettings
  extends DbCollectionRecordsById<Db["Core"]["VatSettings"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectVatSettings, InsertVatSettings>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Vat.VatSettingsSchema,
      foreignKeyColumn: DbSchema.Core.Vat.VatSettingsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionVatSettings {
    return new this(args);
  }

  list(args: QueryArgs<VatSettingsSortField>): Promise<Result<SelectVatSettings[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.VatSchema.SelectVatSettingsSchema,
      ...args,
    });
  }

  insert({ values }: { values: InsertVatSettings }): Promise<Result<SelectVatSettings>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.VatSchema.SelectVatSettingsSchema,
    });
  }
}
