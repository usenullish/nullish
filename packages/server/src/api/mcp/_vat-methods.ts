import { DbCollectionVatMethods, DbVatMethods } from "@usenullish/nullish-engine/core";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { nonNullish } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { WRITE_TOOL, READ_ONLY_TOOL, McpTools, type McpToolsInitArgs, UPDATE_TOOL } from "./_tools";

type SelectVatMethods = Records["Core"]["VatMethods"]["Select"];

export class McpToolsVatMethods extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsVatMethods {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListVatMethods();
    this.#registerGetVatMethod();
  }

  override registerWriteTools() {
    this.#registerCreateVatMethod();
    this.#registerUpdateVatMethod();
  }

  #registerListVatMethods() {
    this.registerTool({
      title: "list_vat_methods",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the VAT methods of an organization: the payment and remuneration methods of each fiscal year (ledger period).",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatMethods.GetVatMethodsResponseSchema),
      fn: async ({ organizationId, query }) => {
        const store: DbCollectionStore<SelectVatMethods, unknown, string> =
          DbCollectionVatMethods.create({
            ...this._args,
            foreignKeyId: organizationId,
          });

        const result = await store.list(query);

        return this.mapResult(result, (methods) => ({
          methods: methods.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetVatMethod() {
    this.registerTool({
      title: "get_vat_method",
      annotations: READ_ONLY_TOOL,
      description: "Returns the VAT methods of a fiscal year by their ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.VatMethods.GetVatMethodsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatMethods.GetVatMethodResponseSchema),
      fn: async ({ id }) => {
        const result = await DbVatMethods.create(this._args).find({ pKey: id });

        return this.mapResult(result, (method) => ({
          method: nonNullish(method) ? this.#encodeResponse(method) : method,
        }));
      },
    });
  }

  #registerCreateVatMethod() {
    this.registerTool({
      title: "create_vat_method",
      annotations: WRITE_TOOL,
      description:
        "Creates the VAT methods of a fiscal year (ledger period) of an organization, which must have VAT settings. The VAT periods of the year are generated, and the Swiss rates of the payment method are seeded the first time the organization uses it (the common rates only if it has no rate yet). The net rate tax, whose net rate is specific to the organization, must then be created. A new fiscal year keeps the VAT methods of the previous one.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.VatMethods.CreateVatMethodRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatMethods.CreateVatMethodResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionVatMethods.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (method) => ({
          method: this.#encodeResponse(method),
        }));
      },
    });
  }

  #registerUpdateVatMethod() {
    this.registerTool({
      title: "update_vat_method",
      annotations: UPDATE_TOOL,
      description:
        "Updates the VAT methods of a fiscal year. Changing the payment method regenerates the VAT periods of the year and seeds the rates of the new method the first time the organization uses it. The methods cannot change once an invoice or a journal entry of the year uses VAT. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.VatMethods.GetVatMethodsRequestSchema.shape.id,
        values: ApiSchema.VatMethods.UpdateVatMethodRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatMethods.UpdateVatMethodResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbVatMethods.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (method) => ({
          method: this.#encodeResponse(method),
        }));
      },
    });
  }

  #encodeResponse = (method: SelectVatMethods) => encodeAuditFieldsResponse(method);
}
