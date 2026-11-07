import { DbCollectionVatMethodSummaries } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeVatMethodSummaryResponse,
} from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

export class McpToolsVatMethodSummaries extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsVatMethodSummaries {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListVatMethodSummaries();
  }

  override registerWriteTools() {}

  #registerListVatMethodSummaries() {
    this.registerTool({
      title: "list_vat_method_summaries",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the VAT methods of an organization, i.e. the payment and remuneration methods of each fiscal year, with their fiscal year (ledger period). Sorted by a field of the fiscal year, e.g. startOn.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatMethodSummaries.GetVatMethodSummariesResponseSchema),
      fn: async ({ organizationId, query }) => {
        const result = await DbCollectionVatMethodSummaries.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).list(query);

        return this.mapResult(result, (vatMethodSummaries) => ({
          vatMethodSummaries: vatMethodSummaries.map(encodeVatMethodSummaryResponse),
        }));
      },
    });
  }
}
