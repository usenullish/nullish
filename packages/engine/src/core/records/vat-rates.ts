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
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";

type SelectVatRates = Records["Core"]["VatRates"]["Select"];
type InsertVatRates = Records["Core"]["VatRates"]["Insert"];
type UpdateVatRates = Records["Core"]["VatRates"]["Update"];

type VatRatesSortField = DbRecordsSortField<Db["Core"]["VatRates"]>;
type FilterVatRates = Records["Core"]["VatRates"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbVatRates
  extends DbRecordsById<Db["Core"]["VatRates"]>
  implements DbStore<SelectVatRates, SelectVatRates["id"], UpdateVatRates>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Vat.VatRatesSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbVatRates {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectVatRates["id"] }): Promise<Result<Option<SelectVatRates>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateVatRates, "version"> & Partial<Omit<UpdateVatRates, "version">>;
    pKey: SelectVatRates["id"];
  }): Promise<Result<SelectVatRates>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
    });
  }
}

export class DbCollectionVatRates
  extends DbCollectionRecordsById<Db["Core"]["VatRates"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectVatRates, InsertVatRates, VatRatesSortField, FilterVatRates>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Vat.VatRatesSchema,
      foreignKeyColumn: DbSchema.Core.Vat.VatRatesSchema.organizationId,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>): DbCollectionVatRates {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<VatRatesSortField, FilterVatRates>): Promise<Result<SelectVatRates[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Core.VatSchema.FilterVatRatesSchema,
        where: ({ type, validOn }) =>
          and(
            nonNullish(type) ? eq(this._table.type, type) : undefined,
            nonNullish(validOn)
              ? and(
                  lte(this._table.startOn, validOn),
                  or(isNull(this._table.endOn), gte(this._table.endOn, validOn)),
                )
              : undefined,
          ),
      },
    });
  }

  insert({ values }: { values: InsertVatRates }): Promise<Result<SelectVatRates>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
    });
  }
}
