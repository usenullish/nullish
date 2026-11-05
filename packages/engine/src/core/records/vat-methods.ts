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

type SelectVatMethods = Records["Core"]["VatMethods"]["Select"];
type InsertVatMethods = Records["Core"]["VatMethods"]["Insert"];
type UpdateVatMethods = Records["Core"]["VatMethods"]["Update"];
type VatMethodsSortField = DbRecordsSortField<Db["Core"]["VatMethods"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbVatMethods
  extends DbRecordsById<Db["Core"]["VatMethods"]>
  implements DbStore<SelectVatMethods, SelectVatMethods["id"], UpdateVatMethods>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Vat.VatMethodsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbVatMethods {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectVatMethods["id"] }): Promise<Result<Option<SelectVatMethods>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.VatSchema.SelectVatMethodsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateVatMethods, "version"> & Partial<Omit<UpdateVatMethods, "version">>;
    pKey: SelectVatMethods["id"];
  }): Promise<Result<SelectVatMethods>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.VatSchema.SelectVatMethodsSchema,
    });
  }
}

export class DbCollectionVatMethods
  extends DbCollectionRecordsById<Db["Core"]["VatMethods"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectVatMethods, InsertVatMethods>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Vat.VatMethodsSchema,
      foreignKeyColumn: DbSchema.Core.Vat.VatMethodsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionVatMethods {
    return new this(args);
  }

  list(args: QueryArgs<VatMethodsSortField>): Promise<Result<SelectVatMethods[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.VatSchema.SelectVatMethodsSchema,
      ...args,
    });
  }

  insert({ values }: { values: InsertVatMethods }): Promise<Result<SelectVatMethods>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.VatSchema.SelectVatMethodsSchema,
    });
  }
}
