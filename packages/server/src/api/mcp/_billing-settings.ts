import { DbCollectionBillingSettings, DbBillingSettings } from "@usenullish/nullish-engine/core";
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
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs, UPDATE_TOOL } from "./_tools";

type SelectBillingSettings = Records["Core"]["BillingSettings"]["Select"];

export class McpToolsBillingSettings extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsBillingSettings {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListBillingSettings();
    this.#registerGetBillingSetting();
  }

  override registerWriteTools() {
    this.#registerUpdateBillingSetting();
  }

  #registerListBillingSettings() {
    this.registerTool({
      title: "list_billing_settings",
      annotations: READ_ONLY_TOOL,
      description: "Returns the billing settings of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.BillingSettings.GetBillingSettingsResponseSchema),
      fn: async ({ organizationId, query }) => {
        const store: DbCollectionStore<SelectBillingSettings, unknown, string> =
          DbCollectionBillingSettings.create({
            ...this._args,
            foreignKeyId: organizationId,
          });

        const result = await store.list(query);

        return this.mapResult(result, (settings) => ({
          settings: settings.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetBillingSetting() {
    this.registerTool({
      title: "get_billing_setting",
      annotations: READ_ONLY_TOOL,
      description: "Returns a billing setting by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.BillingSettings.GetBillingSettingsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.BillingSettings.GetBillingSettingResponseSchema),
      fn: async ({ id }) => {
        const result = await DbBillingSettings.create(this._args).find({ pKey: id });

        return this.mapResult(result, (setting) => ({
          setting: nonNullish(setting) ? this.#encodeResponse(setting) : setting,
        }));
      },
    });
  }

  #registerUpdateBillingSetting() {
    this.registerTool({
      title: "update_billing_setting",
      annotations: UPDATE_TOOL,
      description:
        "Updates a billing setting. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.BillingSettings.GetBillingSettingsRequestSchema.shape.id,
        values: ApiSchema.BillingSettings.UpdateBillingSettingRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.BillingSettings.UpdateBillingSettingResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbBillingSettings.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (setting) => ({
          setting: this.#encodeResponse(setting),
        }));
      },
    });
  }

  #encodeResponse = (setting: SelectBillingSettings) => encodeAuditFieldsResponse(setting);
}
