import { DbCollectionVatSettings, DbVatSettings } from "@usenullish/nullish-engine/core";
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

type SelectVatSettings = Records["Core"]["VatSettings"]["Select"];

export class McpToolsVatSettings extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsVatSettings {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListVatSettings();
    this.#registerGetVatSetting();
  }

  override registerWriteTools() {
    this.#registerCreateVatSetting();
    this.#registerUpdateVatSetting();
  }

  #registerListVatSettings() {
    this.registerTool({
      title: "list_vat_settings",
      annotations: READ_ONLY_TOOL,
      description: "Returns the VAT settings of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatSettings.GetVatSettingsResponseSchema),
      fn: async ({ organizationId, query }) => {
        const store: DbCollectionStore<SelectVatSettings, unknown, string> =
          DbCollectionVatSettings.create({
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

  #registerGetVatSetting() {
    this.registerTool({
      title: "get_vat_setting",
      annotations: READ_ONLY_TOOL,
      description: "Returns a VAT setting by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.VatSettings.GetVatSettingsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatSettings.GetVatSettingResponseSchema),
      fn: async ({ id }) => {
        const result = await DbVatSettings.create(this._args).find({ pKey: id });

        return this.mapResult(result, (setting) => ({
          setting: nonNullish(setting) ? this.#encodeResponse(setting) : setting,
        }));
      },
    });
  }

  #registerCreateVatSetting() {
    this.registerTool({
      title: "create_vat_setting",
      annotations: WRITE_TOOL,
      description:
        "Creates the VAT settings (VAT number) of an organization. The payment and remuneration methods of each fiscal year are then created with create_vat_method.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.VatSettings.CreateVatSettingRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatSettings.CreateVatSettingResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionVatSettings.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (setting) => ({
          setting: this.#encodeResponse(setting),
        }));
      },
    });
  }

  #registerUpdateVatSetting() {
    this.registerTool({
      title: "update_vat_setting",
      annotations: UPDATE_TOOL,
      description:
        "Updates a VAT setting. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.VatSettings.GetVatSettingsRequestSchema.shape.id,
        values: ApiSchema.VatSettings.UpdateVatSettingRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatSettings.UpdateVatSettingResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbVatSettings.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (setting) => ({
          setting: this.#encodeResponse(setting),
        }));
      },
    });
  }

  #encodeResponse = (setting: SelectVatSettings) => encodeAuditFieldsResponse(setting);
}
