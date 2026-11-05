import {
  DbCollectionDocumentTemplates,
  DbDocumentTemplates,
} from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import { nonNullish } from "@usenullish/nullish-common";
import { CrudResource } from "./_factories/crud-resource";
import { type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { Records } from "@usenullish/nullish-schema/records";
import {
  definePostRoute,
  defineGetByIdRoute,
  defineListRoute,
  definePatchRoute,
  defineDeleteRoute,
} from "./_factories/crud-route-config";
import { defineChildListHandler } from "../handlers/child/list";
import { defineGetByIdHandler } from "../handlers/root/get-by-id";
import { defineChildCreateHandler } from "../handlers/child/create";
import { defineUpdateHandler } from "../handlers/root/update";
import { defineDeleteHandler } from "../handlers/root/delete";

const route = {
  spec: { tag: "Document Templates" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/billing/document-templates",
} as const;

const rootRoute = {
  ...route,
  path: "/billing/document-templates",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      filters: { schema: ApiSchema.DocumentTemplates.GetDocumentTemplatesFiltersQuerySchema },
    },
  },
  response: {
    body: { schema: ApiSchema.DocumentTemplates.GetDocumentTemplatesResponseSchema },
    description: "Retrieve a list of document templates",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.DocumentTemplates.GetDocumentTemplateResponseSchema },
    description: "Get a document template",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.DocumentTemplates.CreateDocumentTemplateRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.DocumentTemplates.CreateDocumentTemplateResponseSchema },
    description: "Create a document template",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.DocumentTemplates.UpdateDocumentTemplateRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.DocumentTemplates.UpdateDocumentTemplateResponseSchema },
    description: "Update a document template",
  },
});

type UpdateRoute = typeof updateRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a document template",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class DocumentTemplatesHandlers extends CrudResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
  delete: DeleteRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): DocumentTemplatesHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Core"]["DocumentTemplates"]["Select"],
      Records["Core"]["DocumentTemplates"]["Filter"]
    >({
      store: (args) => DbCollectionDocumentTemplates.create(args),
      resourceKey: "document-templates",
      filtersSchema: ApiSchema.DocumentTemplates.GetDocumentTemplatesFiltersQuerySchema,
      build: ({ result: templates }) => ({
        templates: templates.map(this.#encodeResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["DocumentTemplates"]["Select"]>({
      store: (args) => DbDocumentTemplates.create(args),
      resourceKey: "document-template",
      build: ({ result: template }) => ({
        template: nonNullish(template) ? this.#encodeResponse(template) : template,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["DocumentTemplates"]["Select"]>({
      store: (args) => DbCollectionDocumentTemplates.create(args),
      resourceKey: "document-template",
      build: ({ result: template }) => ({
        template: this.#encodeResponse(template),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["DocumentTemplates"]["Select"],
      Records["Core"]["DocumentTemplates"]["Select"]["id"]
    >({
      store: (args) => DbDocumentTemplates.create(args),
      resourceKey: "document-template",
      build: ({ result: template }) => ({
        template: this.#encodeResponse(template),
      }),
      pKeySchema: ApiSchema.DocumentTemplates.GetDocumentTemplatesRequestSchema.shape.id,
    }),
  };

  protected override readonly defineDelete = {
    route: deleteRoute,
    handler: defineDeleteHandler<
      DeleteRoute,
      Records["Core"]["DocumentTemplates"]["Select"],
      Records["Core"]["DocumentTemplates"]["Select"]["id"]
    >({
      store: (args) => DbDocumentTemplates.create(args),
      resourceKey: "document-template",
      pKeySchema: ApiSchema.DocumentTemplates.GetDocumentTemplatesRequestSchema.shape.id,
    }),
  };

  #encodeResponse = (template: Records["Core"]["DocumentTemplates"]["Select"]) =>
    encodeAuditFieldsResponse(template);
}
