import { DbCollectionTemplateContents, DbTemplateContents } from "@usenullish/nullish-engine/core";
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
import {
  DELETE_TOOL,
  WRITE_TOOL,
  READ_ONLY_TOOL,
  McpTools,
  type McpToolsInitArgs,
  UPDATE_TOOL,
} from "./_tools";

type SelectTemplateContents = Records["Core"]["TemplateContents"]["Select"];
type FilterTemplateContents = Records["Core"]["TemplateContents"]["Filter"];

export class McpToolsTemplateContents extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsTemplateContents {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListTemplateContents();
    this.#registerGetTemplateContent();
  }

  override registerWriteTools() {
    this.#registerCreateTemplateContent();
    this.#registerUpdateTemplateContent();
    this.#registerDeleteTemplateContent();
  }

  #registerListTemplateContents() {
    this.registerTool({
      title: "list_template_contents",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the contents of a document template, one per language, each with the HTML of the template in that language.",
      inputSchema: z.strictObject({
        templateId: ApiSchema.DocumentTemplates.GetDocumentTemplatesRequestSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.TemplateContents.GetTemplateContentsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.TemplateContents.GetTemplateContentsResponseSchema),
      fn: async ({ templateId, query, filters }) => {
        const store: DbCollectionStore<
          SelectTemplateContents,
          unknown,
          string,
          FilterTemplateContents
        > = DbCollectionTemplateContents.create({
          ...this._args,
          foreignKeyId: templateId,
        });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (contents) => ({
          contents: contents.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetTemplateContent() {
    this.registerTool({
      title: "get_template_content",
      annotations: READ_ONLY_TOOL,
      description: "Returns a document template content by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.TemplateContents.GetTemplateContentsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.TemplateContents.GetTemplateContentResponseSchema),
      fn: async ({ id }) => {
        const result = await DbTemplateContents.create(this._args).find({ pKey: id });

        return this.mapResult(result, (content) => ({
          content: nonNullish(content) ? this.#encodeResponse(content) : content,
        }));
      },
    });
  }

  #registerCreateTemplateContent() {
    this.registerTool({
      title: "create_template_content",
      annotations: WRITE_TOOL,
      description:
        "Creates the content of a document template in a language: the HTML of the template in that language. A template has at most one content per language.",
      inputSchema: z.strictObject({
        templateId: ApiSchema.DocumentTemplates.GetDocumentTemplatesRequestSchema.shape.id,
        values: ApiSchema.TemplateContents.CreateTemplateContentRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.TemplateContents.CreateTemplateContentResponseSchema),
      fn: async ({ templateId, values }) => {
        const result = await DbCollectionTemplateContents.create({
          ...this._args,
          foreignKeyId: templateId,
        }).insert({ values });

        return this.mapResult(result, (content) => ({
          content: this.#encodeResponse(content),
        }));
      },
    });
  }

  #registerUpdateTemplateContent() {
    this.registerTool({
      title: "update_template_content",
      annotations: UPDATE_TOOL,
      description:
        "Updates a document template content. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.TemplateContents.GetTemplateContentsRequestSchema.shape.id,
        values: ApiSchema.TemplateContents.UpdateTemplateContentRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.TemplateContents.UpdateTemplateContentResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbTemplateContents.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (content) => ({
          content: this.#encodeResponse(content),
        }));
      },
    });
  }

  #registerDeleteTemplateContent() {
    this.registerTool({
      title: "delete_template_content",
      annotations: DELETE_TOOL,
      description: "Deletes the content of a document template in a language.",
      inputSchema: z.strictObject({
        id: ApiSchema.TemplateContents.GetTemplateContentsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.TemplateContents.GetTemplateContentResponseSchema),
      fn: async ({ id }) => {
        const result = await DbTemplateContents.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (content) => ({
          content: nonNullish(content) ? this.#encodeResponse(content) : content,
        }));
      },
    });
  }

  #encodeResponse = (content: SelectTemplateContents) => encodeAuditFieldsResponse(content);
}
