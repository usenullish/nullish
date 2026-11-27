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

type SelectPeriodJournal = Records["Ledger"]["PeriodJournal"]["Select"];
type InsertPeriodJournal = Records["Ledger"]["PeriodJournal"]["Insert"];
type PeriodJournalSortField = DbRecordsSortField<Db["Ledger"]["PeriodJournal"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionPeriodJournal
  extends DbCollectionRecordsById<Db["Ledger"]["PeriodJournal"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectPeriodJournal, InsertPeriodJournal, PeriodJournalSortField>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema,
      foreignKeyColumn: DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionPeriodJournal {
    return new this(args);
  }

  list(
    args: DbListWithCountArgs<PeriodJournalSortField>,
  ): Promise<Result<DbListResult<SelectPeriodJournal>>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Ledger.PeriodJournalSchema.SelectPeriodJournalEntriesSchema,
      ...args,
    });
  }

  async insert(_args: { values: InsertPeriodJournal }): Promise<Result<SelectPeriodJournal>> {
    return {
      status: "error",
      err: new EngineError("Inserting period journal entries is not supported."),
    };
  }
}
