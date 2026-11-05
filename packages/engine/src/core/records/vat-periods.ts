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

type SelectVatPeriods = Records["Core"]["VatPeriods"]["Select"];
type InsertVatPeriods = Records["Core"]["VatPeriods"]["Insert"];
type UpdateVatPeriods = Records["Core"]["VatPeriods"]["Update"];

type VatPeriodsSortField = DbRecordsSortField<Db["Core"]["VatPeriods"]>;
type FilterVatPeriods = Records["Core"]["VatPeriods"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbVatPeriods
  extends DbRecordsById<Db["Core"]["VatPeriods"]>
  implements DbStore<SelectVatPeriods, SelectVatPeriods["id"], UpdateVatPeriods>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Vat.VatPeriodsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbVatPeriods {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectVatPeriods["id"] }): Promise<Result<Option<SelectVatPeriods>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateVatPeriods, "version"> & Partial<Omit<UpdateVatPeriods, "version">>;
    pKey: SelectVatPeriods["id"];
  }): Promise<Result<SelectVatPeriods>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema,
    });
  }
}

export class DbCollectionVatPeriods
  extends DbCollectionRecordsById<Db["Core"]["VatPeriods"], SelectOrganizations["id"]>
  implements
    DbCollectionStore<SelectVatPeriods, InsertVatPeriods, VatPeriodsSortField, FilterVatPeriods>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Vat.VatPeriodsSchema,
      foreignKeyColumn: DbSchema.Core.Vat.VatPeriodsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionVatPeriods {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<VatPeriodsSortField, FilterVatPeriods>): Promise<Result<SelectVatPeriods[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Core.VatSchema.FilterVatPeriodsSchema,
        where: ({ status }) => and(nonNullish(status) ? eq(this._table.status, status) : undefined),
      },
    });
  }

  insert({ values }: { values: InsertVatPeriods }): Promise<Result<SelectVatPeriods>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema,
    });
  }
}
