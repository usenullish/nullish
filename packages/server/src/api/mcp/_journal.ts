import {
  CreateJournalService,
  DbCollectionJournal,
  DbJournal,
  UpdateJournalService,
} from "@usenullish/nullish-engine/ledger";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import { ApiSchema, CommonSchema, encodeJournalResponse } from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { nonNullish } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import {
  DELETE_TOOL,
  WRITE_TOOL,
  READ_ONLY_TOOL,
  McpTools,
  type McpToolsInitArgs,
  UPDATE_TOOL,
} from "./_tools";

type SelectJournal = Composites["Journal"]["Select"];
type FilterJournal = Composites["Journal"]["Filter"];

export class McpToolsJournal extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsJournal {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListJournalEntries();
    this.#registerGetJournalEntry();
  }

  override registerWriteTools() {
    this.#registerCreateJournalEntry();
    this.#registerUpdateJournalEntry();
    this.#registerDeleteJournalEntry();
  }

  #registerListJournalEntries() {
    this.registerTool({
      title: "list_journal_entries",
      annotations: READ_ONLY_TOOL,
      description: "Returns the journal entries, with their postings, of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.Journal.GetJournalEntriesFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.Journal.GetJournalEntriesResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<SelectJournal, unknown, string, FilterJournal> =
          DbCollectionJournal.create({ ...this._args, foreignKeyId: organizationId });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (journalEntries) => ({
          journalEntries: journalEntries.map(encodeJournalResponse),
        }));
      },
    });
  }

  #registerGetJournalEntry() {
    this.registerTool({
      title: "get_journal_entry",
      annotations: READ_ONLY_TOOL,
      description: "Returns a journal entry, with its postings, by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.Journal.GetJournalEntriesRequestSchema.shape.entry.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Journal.GetJournalEntryResponseSchema),
      fn: async ({ id }) => {
        const result = await DbJournal.create(this._args).find({ pKey: id });

        return this.mapResult(result, (journalEntry) => ({
          journalEntry: nonNullish(journalEntry)
            ? encodeJournalResponse(journalEntry)
            : journalEntry,
        }));
      },
    });
  }

  #registerCreateJournalEntry() {
    this.registerTool({
      title: "create_journal_entry",
      annotations: WRITE_TOOL,
      description:
        "Creates a journal entry with its postings for an organization. Amounts are expressed in the smallest currency unit and the postings must balance (total debit equals total credit). The entry needs a reference or at least one posting with a description.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.Journal.CreateJournalEntryRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Journal.CreateJournalEntryResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await CreateJournalService.create({
          ...this._args,
          organizationId,
        }).create({ values });

        return this.mapResult(result, (journalEntry) => ({
          journalEntry: encodeJournalResponse(journalEntry),
        }));
      },
    });
  }

  #registerUpdateJournalEntry() {
    this.registerTool({
      title: "update_journal_entry",
      annotations: UPDATE_TOOL,
      description:
        "Updates a journal entry and its postings: a posting with an ID is updated, one without is added and the postings left out are removed. The current versions of the entry and of the updated postings must be provided for optimistic locking. The entry needs a reference or at least one posting with a description.",
      inputSchema: z.strictObject({
        id: ApiSchema.Journal.GetJournalEntriesRequestSchema.shape.entry.shape.id,
        values: ApiSchema.Journal.UpdateJournalEntryRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Journal.UpdateJournalEntryResponseSchema),
      fn: async ({ id, values }) => {
        const result = await UpdateJournalService.create({
          ...this._args,
          journalId: id,
        }).update({ values });

        return this.mapResult(result, (journalEntry) => ({
          journalEntry: encodeJournalResponse(journalEntry),
        }));
      },
    });
  }

  #registerDeleteJournalEntry() {
    this.registerTool({
      title: "delete_journal_entry",
      annotations: DELETE_TOOL,
      description:
        "Deletes a journal entry with its postings. An entry of a closed period or booked by an invoice cannot be deleted.",
      inputSchema: z.strictObject({
        id: ApiSchema.Journal.GetJournalEntriesRequestSchema.shape.entry.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Journal.GetJournalEntryResponseSchema),
      fn: async ({ id }) => {
        const result = await DbJournal.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (journalEntry) => ({
          journalEntry: nonNullish(journalEntry)
            ? encodeJournalResponse(journalEntry)
            : journalEntry,
        }));
      },
    });
  }
}
