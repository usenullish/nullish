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

type SelectPeriods = Records["Ledger"]["Periods"]["Select"];
type InsertPeriods = Records["Ledger"]["Periods"]["Insert"];
type UpdatePeriods = Records["Ledger"]["Periods"]["Update"];

type PeriodsSortField = DbRecordsSortField<Db["Ledger"]["Periods"]>;
type FilterPeriods = Records["Ledger"]["Periods"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbPeriods
  extends DbRecordsById<Db["Ledger"]["Periods"]>
  implements DbStore<SelectPeriods, SelectPeriods["id"], UpdatePeriods>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Ledger.Periods.PeriodsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbPeriods {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectPeriods["id"] }): Promise<Result<Option<SelectPeriods>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdatePeriods, "version"> & Partial<Omit<UpdatePeriods, "version">>;
    pKey: SelectPeriods["id"];
  }): Promise<Result<SelectPeriods>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
    });
  }
}

export class DbCollectionPeriods
  extends DbCollectionRecordsById<Db["Ledger"]["Periods"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectPeriods, InsertPeriods, PeriodsSortField, FilterPeriods>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Ledger.Periods.PeriodsSchema,
      foreignKeyColumn: DbSchema.Ledger.Periods.PeriodsSchema.organizationId,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>): DbCollectionPeriods {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<PeriodsSortField, FilterPeriods>): Promise<Result<SelectPeriods[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Ledger.PeriodsSchema.FilterPeriodsSchema,
        where: ({ status }) => and(nonNullish(status) ? eq(this._table.status, status) : undefined),
      },
    });
  }

  insert({ values }: { values: InsertPeriods }): Promise<Result<SelectPeriods>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
    });
  }
}
