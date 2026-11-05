import { isNullish, type Option, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbMaterializedView, DbSchema } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { getColumns } from "drizzle-orm";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import type {
  DbCollectionStoreInitArgs,
  DbDeletableStore,
  DbCollectionStore,
  DbStore,
  DbStoreInitArgs,
  DbListArgs,
} from "../../store";
import { DbUserContext } from "@usenullish/nullish-db";
import {
  deleteJournal,
  findJournalById,
  insertJournal,
  listJournals,
  updateJournal,
} from "../_helpers/journal";
import type { DbRecordsSortField } from "../../_records/records";
import { queryArgsSchema } from "@usenullish/nullish-schema/db";
import { parseQueryArgs } from "../../_query/helpers";

type SelectJournal = Composites["Journal"]["Select"];
type InsertJournal = Composites["Journal"]["Insert"];
type UpdateJournal = Composites["Journal"]["Update"];

type SelectJournalEntries = Records["Ledger"]["JournalEntries"]["Select"];

type JournalSortField = DbRecordsSortField<typeof DbSchema.Ledger.Journal.JournalEntriesSchema>;
type FilterJournal = Composites["Journal"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbJournal
  extends DbUserContext
  implements
    DbStore<SelectJournal, SelectJournalEntries["id"], UpdateJournal>,
    DbDeletableStore<SelectJournal, SelectJournalEntries["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super(args);
  }

  static create(args: DbStoreInitArgs): DbJournal {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectJournalEntries["id"] }): Promise<Result<Option<SelectJournal>>> {
    return tryCatch(async () => {
      return await this._withAuth<Option<SelectJournal>>(async (tx) => {
        return await findJournalById({ tx, id });
      });
    });
  }

  delete({
    pKey: journalId,
  }: {
    pKey: SelectJournal["entry"]["id"];
  }): Promise<Result<Option<SelectJournal>>> {
    return tryCatch(async () => {
      const fn = async () => {
        return await this._withAuth<Option<SelectJournal>>(async (tx) => {
          return await deleteJournal({ tx, journalId });
        });
      };

      return this._withRefresh({
        view: DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView,
        fn,
      });
    });
  }

  update({
    values,
    pKey: journalId,
  }: {
    values: UpdateJournal;
    pKey: SelectJournal["entry"]["id"];
  }): Promise<Result<SelectJournal>> {
    return tryCatch(async () => {
      const fn = async () => {
        return await this._withAuth<SelectJournal>(async (tx) => {
          return await updateJournal({ tx, journalId, values });
        });
      };

      return this._withRefresh({
        view: DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView,
        fn,
      });
    });
  }
}

export class DbCollectionJournal
  extends DbUserContext
  implements DbCollectionStore<SelectJournal, InsertJournal, JournalSortField, FilterJournal>
{
  readonly #foreignKeyId: SelectOrganizations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Ledger.Journal.JournalEntriesSchema)) as [
      JournalSortField,
      ...JournalSortField[],
    ],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super(args);

    this.#foreignKeyId = args.foreignKeyId;
  }

  static create(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>): DbCollectionJournal {
    return new this(args);
  }

  list({
    filters,
    pagination,
    sort,
  }: DbListArgs<JournalSortField, FilterJournal>): Promise<Result<SelectJournal[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: DbSchema.Ledger.Journal.JournalEntriesSchema,
        pKey: DbSchema.Ledger.Journal.JournalEntriesSchema.id,
      });

      const parsedFilters = isNullish(filters)
        ? undefined
        : CompositesSchema.JournalSchema.FilterJournalSchema.parse(filters);

      return await this._withAuth<SelectJournal[]>(async (tx) => {
        return await listJournals({
          tx,
          organizationId: this.#foreignKeyId,
          filters: parsedFilters,
          ...queryArgs,
        });
      });
    });
  }

  insert({
    values: { entry, postings },
  }: {
    values: InsertJournal;
  }): Promise<Result<SelectJournal>> {
    return tryCatch(async () => {
      const fn = async () => {
        return await this._withAuth<SelectJournal>(async (tx) => {
          return await insertJournal({
            values: {
              entry: { ...entry, organizationId: this.#foreignKeyId },
              postings,
            },
            tx,
          });
        });
      };

      return this._withRefresh({
        view: DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView,
        fn,
      });
    });
  }
}
