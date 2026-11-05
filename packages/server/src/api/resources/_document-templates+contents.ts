import { DbCollectionTemplateContents, DbTemplateContents } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import { defineChildListHandler } from "../handlers/child/list";
import { defineGetByIdHandler } from "../handlers/root/get-by-id";
import { defineChildCreateHandler } from "../handlers/child/create";
import { defineUpdateHandler } from "../handlers/root/update";
import { defineDeleteHandler } from "../handlers/root/delete";
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

const route = {
  spec: { tag: "Document Template Contents" },
} as const;

const childRoute = {
  ...route,
  path: "/billing/document-templates/{parentId}/contents",
} as const;

const rootRoute = {
  ...route,
  path: "/billing/template-contents",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      filters: { schema: ApiSchema.TemplateContents.GetTemplateContentsFiltersQuerySchema },
    },
  },
  response: {
    body: { schema: ApiSchema.TemplateContents.GetTemplateContentsResponseSchema },
    description: "Retrieve the contents of a document template, one per language",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.TemplateContents.GetTemplateContentResponseSchema },
    description: "Get a document template content",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.TemplateContents.CreateTemplateContentRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.TemplateContents.CreateTemplateContentResponseSchema },
    description: "Create the content of a document template in a language",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.TemplateContents.UpdateTemplateContentRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.TemplateContents.UpdateTemplateContentResponseSchema },
    description: "Update a document template content",
  },
});

type UpdateRoute = typeof updateRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a document template content",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class TemplateContentsHandlers extends CrudResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
  delete: DeleteRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): TemplateContentsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Core"]["TemplateContents"]["Select"],
      Records["Core"]["TemplateContents"]["Filter"]
    >({
      store: (args) => DbCollectionTemplateContents.create(args),
      resourceKey: "contents",
      filtersSchema: ApiSchema.TemplateContents.GetTemplateContentsFiltersQuerySchema,
      build: ({ result: contents }) => ({
        contents: contents.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["TemplateContents"]["Select"]>({
      store: (args) => DbTemplateContents.create(args),
      resourceKey: "content",
      build: ({ result: content }) => ({
        content: nonNullish(content) ? encodeAuditFieldsResponse(content) : content,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["TemplateContents"]["Select"]>({
      store: (args) => DbCollectionTemplateContents.create(args),
      resourceKey: "content",
      build: ({ result: content }) => ({
        content: encodeAuditFieldsResponse(content),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["TemplateContents"]["Select"],
      Records["Core"]["TemplateContents"]["Select"]["id"]
    >({
      store: (args) => DbTemplateContents.create(args),
      resourceKey: "content",
      build: ({ result: content }) => ({
        content: encodeAuditFieldsResponse(content),
      }),
      pKeySchema: ApiSchema.TemplateContents.GetTemplateContentsRequestSchema.shape.id,
    }),
  };

  protected override readonly defineDelete = {
    route: deleteRoute,
    handler: defineDeleteHandler<
      DeleteRoute,
      Records["Core"]["TemplateContents"]["Select"],
      Records["Core"]["TemplateContents"]["Select"]["id"]
    >({
      store: (args) => DbTemplateContents.create(args),
      resourceKey: "content",
      pKeySchema: ApiSchema.TemplateContents.GetTemplateContentsRequestSchema.shape.id,
    }),
  };
}
