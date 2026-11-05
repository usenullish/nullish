import {
  DbCollectionJournalSummaries,
  DbJournalSummaries,
} from "@usenullish/nullish-engine/ledger";
import {
  ApiSchema,
  CommonSchema,
  encodeJournalSummaryResponse,
} from "@usenullish/nullish-schema/server";
import { nonNullish } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

export class McpToolsJournalSummaries extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsJournalSummaries {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListJournalSummaries();
    this.#registerGetJournalSummary();
  }

  override registerWriteTools() {}

  #registerListJournalSummaries() {
    this.registerTool({
      title: "list_journal_summaries",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the journal entries of an organization with their postings and, for the entries booked by an invoice, the invoice and what the entry books for it (open, payment, void or uncollectible).",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.JournalSummaries.GetJournalSummariesFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.JournalSummaries.GetJournalSummariesResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const result = await DbCollectionJournalSummaries.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).list({ ...query, filters });

        return this.mapResult(result, (journalSummaries) => ({
          journalSummaries: journalSummaries.map(encodeJournalSummaryResponse),
        }));
      },
    });
  }

  #registerGetJournalSummary() {
    this.registerTool({
      title: "get_journal_summary",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns a journal entry by its ID with its postings and, when it is booked by an invoice, the invoice and what the entry books for it (open, payment, void or uncollectible).",
      inputSchema: z.strictObject({
        id: ApiSchema.Journal.GetJournalEntriesRequestSchema.shape.entry.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.JournalSummaries.GetJournalSummaryResponseSchema),
      fn: async ({ id }) => {
        const result = await DbJournalSummaries.create(this._args).find({ pKey: id });

        return this.mapResult(result, (journalSummary) => ({
          journalSummary: nonNullish(journalSummary)
            ? encodeJournalSummaryResponse(journalSummary)
            : journalSummary,
        }));
      },
    });
  }
}
