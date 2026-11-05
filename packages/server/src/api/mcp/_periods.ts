import {
  ClosePeriodService,
  DbCollectionPeriods,
  DbPeriods,
} from "@usenullish/nullish-engine/ledger";
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
import {
  DESTRUCTIVE_TOOL,
  WRITE_TOOL,
  READ_ONLY_TOOL,
  McpTools,
  type McpToolsInitArgs,
  UPDATE_TOOL,
} from "./_tools";

type SelectPeriods = Records["Ledger"]["Periods"]["Select"];
type FilterPeriods = Records["Ledger"]["Periods"]["Filter"];

export class McpToolsPeriods extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsPeriods {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListPeriods();
    this.#registerGetPeriod();
  }

  override registerWriteTools() {
    this.#registerCreatePeriod();
    this.#registerUpdatePeriod();
    this.#registerClosePeriod();
  }

  #registerListPeriods() {
    this.registerTool({
      title: "list_periods",
      annotations: READ_ONLY_TOOL,
      description: "Returns the accounting periods (fiscal years) of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.Periods.GetPeriodsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.Periods.GetPeriodsResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<SelectPeriods, unknown, string, FilterPeriods> =
          DbCollectionPeriods.create({ ...this._args, foreignKeyId: organizationId });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (periods) => ({
          periods: periods.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetPeriod() {
    this.registerTool({
      title: "get_period",
      annotations: READ_ONLY_TOOL,
      description: "Returns an accounting period (fiscal year) by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.Periods.GetPeriodsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Periods.GetPeriodResponseSchema),
      fn: async ({ id }) => {
        const result = await DbPeriods.create(this._args).find({ pKey: id });

        return this.mapResult(result, (period) => ({
          period: nonNullish(period) ? this.#encodeResponse(period) : period,
        }));
      },
    });
  }

  #registerCreatePeriod() {
    this.registerTool({
      title: "create_period",
      annotations: WRITE_TOOL,
      description: "Creates an accounting period (fiscal year) for an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.Periods.CreatePeriodRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Periods.CreatePeriodResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionPeriods.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (period) => ({
          period: this.#encodeResponse(period),
        }));
      },
    });
  }

  #registerUpdatePeriod() {
    this.registerTool({
      title: "update_period",
      annotations: UPDATE_TOOL,
      description:
        "Updates an accounting period (fiscal year). The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.Periods.GetPeriodsRequestSchema.shape.id,
        values: ApiSchema.Periods.UpdatePeriodRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Periods.UpdatePeriodResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbPeriods.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (period) => ({
          period: this.#encodeResponse(period),
        }));
      },
    });
  }

  #registerClosePeriod() {
    this.registerTool({
      title: "close_period",
      annotations: DESTRUCTIVE_TOOL,
      description:
        "Closes an accounting period (fiscal year). By default (mode closing_entries) the result of the year is booked, the balances of the balance sheet accounts are carried over to the next period, and the period becomes immutable; the previous periods and the VAT periods of the period must be closed, and the next period must exist. With mode status_only, nothing is booked and the period is only marked as closed, e.g. when its closing entries are already in the books after a migration; the previous periods and its VAT periods must be closed as well. A closing cannot be undone.",
      inputSchema: z.strictObject({
        periodId: ApiSchema.Periods.GetPeriodsRequestSchema.shape.id,
        ...ApiSchema.PeriodsClose.ClosePeriodRequestSchema.shape,
      }),
      outputSchema: toJsonSchema(ApiSchema.PeriodsClose.ClosePeriodResponseSchema),
      fn: async ({ periodId, mode }) => {
        const result = await ClosePeriodService.create({ ...this._args, periodId }).close({ mode });

        return this.mapResult(result, (period) => ({
          period: this.#encodeResponse(period),
        }));
      },
    });
  }

  #encodeResponse = (period: SelectPeriods) => ({
    ...encodeAuditFieldsResponse(period),
    startOn: encodeWithCodecs({ schema: DateCodec, value: period.startOn }),
    endOn: encodeWithCodecs({ schema: DateCodec, value: period.endOn }),
  });
}
