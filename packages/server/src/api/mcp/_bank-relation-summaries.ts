import { DbCollectionBankRelationSummaries } from "@usenullish/nullish-engine/banking";
import {
  ApiSchema,
  CommonSchema,
  encodeBankRelationSummaryResponse,
} from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

export class McpToolsBankRelationSummaries extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsBankRelationSummaries {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListBankRelationSummaries();
  }

  override registerWriteTools() {}

  #registerListBankRelationSummaries() {
    this.registerTool({
      title: "list_bank_relation_summaries",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the bank relations of an organization, i.e. its bank accounts, with the number of their movements that are not reconciled yet, i.e. imported from the bank but not booked in the ledger, and their balance as given by the bank in the latest statement imported.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(
        ApiSchema.BankRelationSummaries.GetBankRelationSummariesResponseSchema,
      ),
      fn: async ({ organizationId, query }) => {
        const result = await DbCollectionBankRelationSummaries.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).list(query);

        return this.mapResult(result, (bankRelationSummaries) => ({
          bankRelationSummaries: bankRelationSummaries.map(encodeBankRelationSummaryResponse),
        }));
      },
    });
  }
}
