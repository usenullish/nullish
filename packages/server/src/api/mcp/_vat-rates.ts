import { DbCollectionVatRates, DbVatRates } from "@usenullish/nullish-engine/core";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { DateCodec, nonNullish, encodeWithCodecs } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { WRITE_TOOL, READ_ONLY_TOOL, McpTools, type McpToolsInitArgs, UPDATE_TOOL } from "./_tools";

type SelectVatRates = Records["Core"]["VatRates"]["Select"];
type FilterVatRates = Records["Core"]["VatRates"]["Filter"];

export class McpToolsVatRates extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsVatRates {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListVatRates();
    this.#registerGetVatRate();
  }

  override registerWriteTools() {
    this.#registerCreateVatRate();
    this.#registerUpdateVatRate();
  }

  #registerListVatRates() {
    this.registerTool({
      title: "list_vat_rates",
      annotations: READ_ONLY_TOOL,
      description: "Returns the VAT rates of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.VatRates.GetVatRatesFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.VatRates.GetVatRatesResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<SelectVatRates, unknown, string, FilterVatRates> =
          DbCollectionVatRates.create({
            ...this._args,
            foreignKeyId: organizationId,
          });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (rates) => ({
          rates: rates.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetVatRate() {
    this.registerTool({
      title: "get_vat_rate",
      annotations: READ_ONLY_TOOL,
      description: "Returns a VAT rate by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.VatRates.GetVatRatesRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatRates.GetVatRateResponseSchema),
      fn: async ({ id }) => {
        const result = await DbVatRates.create(this._args).find({ pKey: id });

        return this.mapResult(result, (rate) => ({
          rate: nonNullish(rate) ? this.#encodeResponse(rate) : rate,
        }));
      },
    });
  }

  #registerCreateVatRate() {
    this.registerTool({
      title: "create_vat_rate",
      annotations: WRITE_TOOL,
      description: "Creates a VAT rate for an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.VatRates.CreateVatRateRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatRates.CreateVatRateResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionVatRates.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (rate) => ({
          rate: this.#encodeResponse(rate),
        }));
      },
    });
  }

  #registerUpdateVatRate() {
    this.registerTool({
      title: "update_vat_rate",
      annotations: UPDATE_TOOL,
      description:
        "Updates a VAT rate. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.VatRates.GetVatRatesRequestSchema.shape.id,
        values: ApiSchema.VatRates.UpdateVatRateRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatRates.UpdateVatRateResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbVatRates.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (rate) => ({
          rate: this.#encodeResponse(rate),
        }));
      },
    });
  }

  #encodeResponse = (rate: SelectVatRates) => ({
    ...encodeAuditFieldsResponse(rate),
    startOn: encodeWithCodecs({ schema: DateCodec, value: rate.startOn }),
    endOn: nonNullish(rate.endOn)
      ? encodeWithCodecs({ schema: DateCodec, value: rate.endOn })
      : null,
  });
}
