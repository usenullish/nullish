import { DbCurrencies } from "@usenullish/nullish-engine/core";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

type SelectCurrencies = Records["Core"]["Currencies"]["Select"];

export class McpToolsCurrencies extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsCurrencies {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListCurrencies();
  }

  override registerWriteTools() {}

  #registerListCurrencies() {
    this.registerTool({
      title: "list_currencies",
      annotations: READ_ONLY_TOOL,
      description: "Returns the currencies supported by the platform.",
      inputSchema: z.strictObject({
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Currencies.GetCurrenciesResponseSchema),
      fn: async ({ query }) => {
        const store: DbCollectionStore<SelectCurrencies, unknown, string> = DbCurrencies.create(
          this._args,
        );

        const result = await store.list(query);

        return this.mapResult(result, (currencies) => ({
          currencies: currencies.map(encodeAuditFieldsResponse),
        }));
      },
    });
  }
}
