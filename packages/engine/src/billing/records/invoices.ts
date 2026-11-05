import { type Option, type Result } from "@usenullish/nullish-common";
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
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import { buildInvoicesWhere } from "../_helpers/invoices";
import type { DbRecordsSortField } from "../../_records/records";

type SelectInvoices = Records["Billing"]["Invoices"]["Select"];
type InsertInvoices = Records["Billing"]["Invoices"]["Insert"];
type UpdateInvoices = Records["Billing"]["Invoices"]["Update"];

type InvoicesSortField = DbRecordsSortField<Db["Billing"]["Invoices"]>;
type FilterInvoices = Records["Billing"]["Invoices"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbInvoices
  extends DbRecordsById<Db["Billing"]["Invoices"]>
  implements
    DbStore<SelectInvoices, SelectInvoices["id"], UpdateInvoices>,
    DbDeletableStore<SelectInvoices, SelectInvoices["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Billing.Invoices.InvoicesSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbInvoices {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectInvoices["id"] }): Promise<Result<Option<SelectInvoices>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    });
  }

  delete({ pKey: id }: { pKey: SelectInvoices["id"] }): Promise<Result<Option<SelectInvoices>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateInvoices, "version"> & Partial<Omit<UpdateInvoices, "version">>;
    pKey: SelectInvoices["id"];
  }): Promise<Result<SelectInvoices>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    });
  }
}

export class DbCollectionInvoices
  extends DbCollectionRecordsById<Db["Billing"]["Invoices"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectInvoices, InsertInvoices, InvoicesSortField, FilterInvoices>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Billing.Invoices.InvoicesSchema,
      foreignKeyColumn: DbSchema.Billing.Invoices.InvoicesSchema.organizationId,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>): DbCollectionInvoices {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<InvoicesSortField, FilterInvoices>): Promise<Result<SelectInvoices[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Billing.InvoicesSchema.FilterInvoicesSchema,
        where: buildInvoicesWhere,
      },
    });
  }

  insert({ values }: { values: InsertInvoices }): Promise<Result<SelectInvoices>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    });
  }
}
