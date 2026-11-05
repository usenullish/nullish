import { DbCollectionVatPeriods, DbVatPeriods } from "@usenullish/nullish-engine/core";
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

type SelectVatPeriods = Records["Core"]["VatPeriods"]["Select"];
type FilterVatPeriods = Records["Core"]["VatPeriods"]["Filter"];

export class McpToolsVatPeriods extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsVatPeriods {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListVatPeriods();
    this.#registerGetVatPeriod();
  }

  override registerWriteTools() {
    this.#registerCreateVatPeriod();
    this.#registerUpdateVatPeriod();
  }

  #registerListVatPeriods() {
    this.registerTool({
      title: "list_vat_periods",
      annotations: READ_ONLY_TOOL,
      description: "Returns the VAT periods of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.VatPeriods.GetVatPeriodsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.VatPeriods.GetVatPeriodsResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<SelectVatPeriods, unknown, string, FilterVatPeriods> =
          DbCollectionVatPeriods.create({
            ...this._args,
            foreignKeyId: organizationId,
          });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (periods) => ({
          periods: periods.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetVatPeriod() {
    this.registerTool({
      title: "get_vat_period",
      annotations: READ_ONLY_TOOL,
      description: "Returns a VAT period by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.VatPeriods.GetVatPeriodsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatPeriods.GetVatPeriodResponseSchema),
      fn: async ({ id }) => {
        const result = await DbVatPeriods.create(this._args).find({ pKey: id });

        return this.mapResult(result, (period) => ({
          period: nonNullish(period) ? this.#encodeResponse(period) : period,
        }));
      },
    });
  }

  #registerCreateVatPeriod() {
    this.registerTool({
      title: "create_vat_period",
      annotations: WRITE_TOOL,
      description: "Creates a VAT period for an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.VatPeriods.CreateVatPeriodRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatPeriods.CreateVatPeriodResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionVatPeriods.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (period) => ({
          period: this.#encodeResponse(period),
        }));
      },
    });
  }

  #registerUpdateVatPeriod() {
    this.registerTool({
      title: "update_vat_period",
      annotations: UPDATE_TOOL,
      description:
        "Updates a VAT period. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.VatPeriods.GetVatPeriodsRequestSchema.shape.id,
        values: ApiSchema.VatPeriods.UpdateVatPeriodRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatPeriods.UpdateVatPeriodResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbVatPeriods.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (period) => ({
          period: this.#encodeResponse(period),
        }));
      },
    });
  }

  #encodeResponse = (period: SelectVatPeriods) => ({
    ...encodeAuditFieldsResponse(period),
    startOn: encodeWithCodecs({ schema: DateCodec, value: period.startOn }),
    endOn: encodeWithCodecs({ schema: DateCodec, value: period.endOn }),
  });
}
