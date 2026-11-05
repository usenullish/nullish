import {
  DbCollectionDocumentTemplates,
  DbDocumentTemplates,
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
import {
  DELETE_TOOL,
  WRITE_TOOL,
  READ_ONLY_TOOL,
  McpTools,
  type McpToolsInitArgs,
  UPDATE_TOOL,
} from "./_tools";

type SelectDocumentTemplates = Records["Core"]["DocumentTemplates"]["Select"];
type FilterDocumentTemplates = Records["Core"]["DocumentTemplates"]["Filter"];

export class McpToolsDocumentTemplates extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsDocumentTemplates {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListDocumentTemplates();
    this.#registerGetDocumentTemplate();
  }

  override registerWriteTools() {
    this.#registerCreateDocumentTemplate();
    this.#registerUpdateDocumentTemplate();
    this.#registerDeleteDocumentTemplate();
  }

  #registerListDocumentTemplates() {
    this.registerTool({
      title: "list_document_templates",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the document templates of an organization: their type and name. The HTML of a template is in its contents, one per language (list_template_contents).",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.DocumentTemplates.GetDocumentTemplatesFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.DocumentTemplates.GetDocumentTemplatesResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<
          SelectDocumentTemplates,
          unknown,
          string,
          FilterDocumentTemplates
        > = DbCollectionDocumentTemplates.create({
          ...this._args,
          foreignKeyId: organizationId,
        });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (templates) => ({
          templates: templates.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetDocumentTemplate() {
    this.registerTool({
      title: "get_document_template",
      annotations: READ_ONLY_TOOL,
      description: "Returns a document template by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.DocumentTemplates.GetDocumentTemplatesRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.DocumentTemplates.GetDocumentTemplateResponseSchema),
      fn: async ({ id }) => {
        const result = await DbDocumentTemplates.create(this._args).find({ pKey: id });

        return this.mapResult(result, (template) => ({
          template: nonNullish(template) ? this.#encodeResponse(template) : template,
        }));
      },
    });
  }

  #registerCreateDocumentTemplate() {
    this.registerTool({
      title: "create_document_template",
      annotations: WRITE_TOOL,
      description: "Creates a document template for an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.DocumentTemplates.CreateDocumentTemplateRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.DocumentTemplates.CreateDocumentTemplateResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionDocumentTemplates.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (template) => ({
          template: this.#encodeResponse(template),
        }));
      },
    });
  }

  #registerUpdateDocumentTemplate() {
    this.registerTool({
      title: "update_document_template",
      annotations: UPDATE_TOOL,
      description:
        "Updates a document template. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.DocumentTemplates.GetDocumentTemplatesRequestSchema.shape.id,
        values: ApiSchema.DocumentTemplates.UpdateDocumentTemplateRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.DocumentTemplates.UpdateDocumentTemplateResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbDocumentTemplates.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (template) => ({
          template: this.#encodeResponse(template),
        }));
      },
    });
  }

  #registerDeleteDocumentTemplate() {
    this.registerTool({
      title: "delete_document_template",
      annotations: DELETE_TOOL,
      description: "Deletes a document template.",
      inputSchema: z.strictObject({
        id: ApiSchema.DocumentTemplates.GetDocumentTemplatesRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.DocumentTemplates.GetDocumentTemplateResponseSchema),
      fn: async ({ id }) => {
        const result = await DbDocumentTemplates.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (template) => ({
          template: nonNullish(template) ? this.#encodeResponse(template) : template,
        }));
      },
    });
  }

  #encodeResponse = (template: SelectDocumentTemplates) => encodeAuditFieldsResponse(template);
}
