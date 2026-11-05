import {
  DbCollectionInvoiceSummaries,
  DbInvoiceSummaries,
} from "@usenullish/nullish-engine/billing";
import {
  ApiSchema,
  CommonSchema,
  encodeInvoiceSummaryResponse,
} from "@usenullish/nullish-schema/server";
import { nonNullish } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

export class McpToolsInvoiceSummaries extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsInvoiceSummaries {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListInvoiceSummaries();
    this.#registerGetInvoiceSummary();
  }

  override registerWriteTools() {}

  #registerListInvoiceSummaries() {
    this.registerTool({
      title: "list_invoice_summaries",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the invoices of an organization with their amounts: the totals billed to the client (subtotal, VAT, total) and the balance (paid, remaining).",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.InvoiceSummaries.GetInvoiceSummariesFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.InvoiceSummaries.GetInvoiceSummariesResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const result = await DbCollectionInvoiceSummaries.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).list({ ...query, filters });

        return this.mapResult(result, (invoiceSummaries) => ({
          invoiceSummaries: invoiceSummaries.map(encodeInvoiceSummaryResponse),
        }));
      },
    });
  }

  #registerGetInvoiceSummary() {
    this.registerTool({
      title: "get_invoice_summary",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns an invoice by its ID with its amounts: the totals billed to the client (subtotal, VAT, total) and the balance (paid, remaining).",
      inputSchema: z.strictObject({
        id: ApiSchema.Invoices.InvoiceSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.InvoiceSummaries.GetInvoiceSummaryResponseSchema),
      fn: async ({ id }) => {
        const result = await DbInvoiceSummaries.create(this._args).find({ pKey: id });

        return this.mapResult(result, (invoiceSummary) => ({
          invoiceSummary: nonNullish(invoiceSummary)
            ? encodeInvoiceSummaryResponse(invoiceSummary)
            : invoiceSummary,
        }));
      },
    });
  }
}
