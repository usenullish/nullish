import type { Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbListWithCountArgs,
  DbListResult,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { EngineError } from "../../errors";

type SelectMovementJournal = Records["Banking"]["MovementJournal"]["Select"];
type InsertMovementJournal = Records["Banking"]["MovementJournal"]["Insert"];
type MovementJournalSortField = DbRecordsSortField<Db["Banking"]["MovementJournal"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionMovementJournal
  extends DbCollectionRecordsById<Db["Banking"]["MovementJournal"], SelectOrganizations["id"]>
  implements
    DbCollectionStore<SelectMovementJournal, InsertMovementJournal, MovementJournalSortField>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema,
      foreignKeyColumn:
        DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionMovementJournal {
    return new this(args);
  }

  list(
    args: DbListWithCountArgs<MovementJournalSortField>,
  ): Promise<Result<DbListResult<SelectMovementJournal>>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Banking.MovementJournalSchema.SelectMovementJournalEntriesSchema,
      ...args,
    });
  }

  async insert(_args: { values: InsertMovementJournal }): Promise<Result<SelectMovementJournal>> {
    return {
      status: "error",
      err: new EngineError("Inserting movement journal entries is not supported."),
    };
  }
}
