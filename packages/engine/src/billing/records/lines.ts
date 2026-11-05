import { nonNullish, type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbDeletableStore,
  DbListArgs,
  DbStore,
  DbStoreInitArgs,
} from "../../store";
import { DbChildCollectionRecordsById } from "../../_records/child-collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { EngineError } from "../../errors";
import { and, eq } from "drizzle-orm";

type SelectLines = Records["Billing"]["Lines"]["Select"];
type InsertLines = Records["Billing"]["Lines"]["Insert"];

type LinesSortField = DbRecordsSortField<Db["Billing"]["Lines"]>;
type FilterLines = Records["Billing"]["Lines"]["Filter"];

type SelectInvoices = Records["Billing"]["Invoices"]["Select"];

export class DbLines
  extends DbRecordsById<Db["Billing"]["Lines"]>
  implements
    DbStore<SelectLines, SelectLines["id"], unknown>,
    DbDeletableStore<SelectLines, SelectLines["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Billing.Invoices.LinesSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbLines {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectLines["id"] }): Promise<Result<Option<SelectLines>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema,
    });
  }

  delete({ pKey: id }: { pKey: SelectLines["id"] }): Promise<Result<Option<SelectLines>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema,
    });
  }

  async update(_args: { values: unknown; pKey: SelectLines["id"] }): Promise<Result<SelectLines>> {
    return {
      status: "error",
      err: new EngineError("Invoice-lines cannot be updated."),
    };
  }
}

export class DbCollectionLines
  extends DbChildCollectionRecordsById<Db["Billing"]["Lines"], SelectInvoices["id"]>
  implements DbCollectionStore<SelectLines, InsertLines, LinesSortField, FilterLines>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectInvoices["id"]>) {
    super({
      ...args,
      table: DbSchema.Billing.Invoices.LinesSchema,
      foreignKeyColumn: DbSchema.Billing.Invoices.LinesSchema.invoiceId,
      parentTable: DbSchema.Billing.Invoices.InvoicesSchema,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectInvoices["id"]>): DbCollectionLines {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<LinesSortField, FilterLines>): Promise<Result<SelectLines[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Billing.InvoicesSchema.FilterLinesSchema,
        where: ({ type }) => and(nonNullish(type) ? eq(this._table.type, type) : undefined),
      },
    });
  }

  listAll(): Promise<Result<SelectLines[]>> {
    return this._queryAllWithForeignKeyId({
      schema: RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema,
      sort: { field: "createdAt", direction: "asc" },
    });
  }

  insert({ values }: { values: InsertLines }): Promise<Result<SelectLines>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema,
    });
  }
}
