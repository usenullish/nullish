import {
  DbCollectionAccountingSettings,
  DbAccountingSettings,
} from "@usenullish/nullish-engine/core";
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

type SelectAccountingSettings = Records["Core"]["AccountingSettings"]["Select"];

export class McpToolsAccountingSettings extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsAccountingSettings {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListAccountingSettings();
    this.#registerGetAccountingSetting();
  }

  override registerWriteTools() {
    this.#registerUpdateAccountingSetting();
  }

  #registerListAccountingSettings() {
    this.registerTool({
      title: "list_accounting_settings",
      annotations: READ_ONLY_TOOL,
      description: "Returns the accounting settings of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.AccountingSettings.GetAccountingSettingsResponseSchema),
      fn: async ({ organizationId, query }) => {
        const store: DbCollectionStore<SelectAccountingSettings, unknown, string> =
          DbCollectionAccountingSettings.create({
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

  #registerGetAccountingSetting() {
    this.registerTool({
      title: "get_accounting_setting",
      annotations: READ_ONLY_TOOL,
      description: "Returns an accounting setting by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.AccountingSettings.GetAccountingSettingsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.AccountingSettings.GetAccountingSettingResponseSchema),
      fn: async ({ id }) => {
        const result = await DbAccountingSettings.create(this._args).find({ pKey: id });

        return this.mapResult(result, (setting) => ({
          setting: nonNullish(setting) ? this.#encodeResponse(setting) : setting,
        }));
      },
    });
  }

  #registerUpdateAccountingSetting() {
    this.registerTool({
      title: "update_accounting_setting",
      annotations: UPDATE_TOOL,
      description:
        "Updates an accounting setting. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.AccountingSettings.GetAccountingSettingsRequestSchema.shape.id,
        values: ApiSchema.AccountingSettings.UpdateAccountingSettingRequestSchema,
      }),
      outputSchema: toJsonSchema(
        ApiSchema.AccountingSettings.UpdateAccountingSettingResponseSchema,
      ),
      fn: async ({ id, values }) => {
        const result = await DbAccountingSettings.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (setting) => ({
          setting: this.#encodeResponse(setting),
        }));
      },
    });
  }

  #encodeResponse = (setting: SelectAccountingSettings) => encodeAuditFieldsResponse(setting);
}
