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

type SelectPostingManualVatPostings = Records["Ledger"]["PostingManualVatPostings"]["Select"];
type InsertPostingManualVatPostings = Records["Ledger"]["PostingManualVatPostings"]["Insert"];
type PostingManualVatPostingsSortField = DbRecordsSortField<
  Db["Ledger"]["PostingManualVatPostings"]
>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionPostingManualVatPostings
  extends DbCollectionRecordsById<
    Db["Ledger"]["PostingManualVatPostings"],
    SelectOrganizations["id"]
  >
  implements
    DbCollectionStore<
      SelectPostingManualVatPostings,
      InsertPostingManualVatPostings,
      PostingManualVatPostingsSortField
    >
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema,
      foreignKeyColumn:
        DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionPostingManualVatPostings {
    return new this(args);
  }

  list(
    args: DbListArgs<PostingManualVatPostingsSortField>,
  ): Promise<Result<DbListResult<SelectPostingManualVatPostings>>> {
    return this._queryWithForeignKeyId({
      schema:
        RecordsSchema.Ledger.PostingManualVatPostingsSchema.SelectPostingManualVatPostingsSchema,
      ...args,
    });
  }

  async insert(_args: {
    values: InsertPostingManualVatPostings;
  }): Promise<Result<SelectPostingManualVatPostings>> {
    return {
      status: "error",
      err: new EngineError("Inserting manual VAT postings is not supported."),
    };
  }
}
