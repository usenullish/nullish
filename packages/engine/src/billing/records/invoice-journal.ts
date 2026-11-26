import type { Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbListArgs,
  DbListResult,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { EngineError } from "../../errors";

type SelectInvoiceJournal = Records["Billing"]["InvoiceJournal"]["Select"];
type InsertInvoiceJournal = Records["Billing"]["InvoiceJournal"]["Insert"];
type InvoiceJournalSortField = DbRecordsSortField<Db["Billing"]["InvoiceJournal"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionInvoiceJournal
  extends DbCollectionRecordsById<Db["Billing"]["InvoiceJournal"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectInvoiceJournal, InsertInvoiceJournal, InvoiceJournalSortField>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
      foreignKeyColumn: DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionInvoiceJournal {
    return new this(args);
  }

  list(
    args: DbListArgs<InvoiceJournalSortField>,
  ): Promise<Result<DbListResult<SelectInvoiceJournal>>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema,
      ...args,
    });
  }

  async insert(_args: { values: InsertInvoiceJournal }): Promise<Result<SelectInvoiceJournal>> {
    return {
      status: "error",
      err: new EngineError("Inserting invoice journal entries is not supported."),
    };
  }
}
