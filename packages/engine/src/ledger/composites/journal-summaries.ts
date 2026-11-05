import { DbUserContext } from "@usenullish/nullish-db";
import {
  isArrayAtLeastOne,
  isNullish,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { DbSchema, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { getColumns } from "drizzle-orm";
import type { DbCollectionStoreInitArgs, DbListArgs, DbStoreInitArgs } from "../../store";
import { loadJournalSummaries } from "../_helpers/journal-summaries";
import { findJournalById, listJournals } from "../_helpers/journal";
import { parseQueryArgs } from "../../_query/helpers";

type JournalEntry = Records["Ledger"]["JournalEntries"]["Select"];
type JournalSummary = Composites["JournalSummaries"]["Select"];
type FilterJournalSummaries = Composites["JournalSummaries"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbJournalSummaries extends DbUserContext {
  private constructor(args: DbStoreInitArgs) {
    super(args);
  }

  static create(args: DbStoreInitArgs): DbJournalSummaries {
    return new this(args);
  }

  find({ pKey: id }: { pKey: JournalEntry["id"] }): Promise<Result<Option<JournalSummary>>> {
    return tryCatch(async () => {
      return await this._withAuth<Option<JournalSummary>>(async (tx) => {
        const journal = await findJournalById({ tx, id });

        if (isNullish(journal)) {
          return undefined;
        }

        const [summary] = await loadJournalSummaries({ tx, journals: [journal] });

        return summary;
      });
    });
  }
}

export class DbCollectionJournalSummaries extends DbUserContext {
  readonly #organizationId: SelectOrganizations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Ledger.Journal.JournalEntriesSchema)) as [string, ...string[]],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super(args);

    this.#organizationId = args.foreignKeyId;
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionJournalSummaries {
    return new this(args);
  }

  list({
    filters,
    pagination,
    sort,
  }: DbListArgs<string, FilterJournalSummaries>): Promise<Result<JournalSummary[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: DbSchema.Ledger.Journal.JournalEntriesSchema,
        pKey: DbSchema.Ledger.Journal.JournalEntriesSchema.id,
      });

      const parsedFilters = isNullish(filters)
        ? undefined
        : CompositesSchema.JournalSummariesSchema.FilterJournalSummariesSchema.parse(filters);

      return await this._withAuth<JournalSummary[]>(async (tx) => {
        const journals = await listJournals({
          tx,
          organizationId: this.#organizationId,
          filters: parsedFilters,
          ...queryArgs,
        });

        if (!isArrayAtLeastOne(journals)) {
          return [];
        }

        return await loadJournalSummaries({ tx, journals });
      });
    });
  }
}
