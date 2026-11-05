import { DbCollectionVatMethods, DbVatMethods } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import { nonNullish } from "@usenullish/nullish-common";
import { RouteResource } from "./_factories/crud-resource";
import { type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { Records } from "@usenullish/nullish-schema/records";
import {
  definePostRoute,
  defineGetByIdRoute,
  defineListRoute,
  definePatchRoute,
} from "./_factories/crud-route-config";
import { defineChildListHandler } from "../handlers/child/list";
import { defineGetByIdHandler } from "../handlers/root/get-by-id";
import { defineChildCreateHandler } from "../handlers/child/create";
import { defineUpdateHandler } from "../handlers/root/update";

const route = {
  spec: { tag: "VAT Methods" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/vat/methods",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/vat/methods",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.VatMethods.GetVatMethodsResponseSchema },
    description: "Retrieve the VAT methods of the fiscal years",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.VatMethods.GetVatMethodResponseSchema },
    description: "Get the VAT methods of a fiscal year",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.VatMethods.CreateVatMethodRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatMethods.CreateVatMethodResponseSchema },
    description: "Create the VAT methods of a fiscal year",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.VatMethods.UpdateVatMethodRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatMethods.UpdateVatMethodResponseSchema },
    description: "Update the VAT methods of a fiscal year",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class VatMethodsHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): VatMethodsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<ListRoute, Records["Core"]["VatMethods"]["Select"]>({
      store: (args) => DbCollectionVatMethods.create(args),
      resourceKey: "vat+methods",
      build: ({ result: methods }) => ({
        methods: methods.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["VatMethods"]["Select"]>({
      store: (args) => DbVatMethods.create(args),
      resourceKey: "vat+method",
      build: ({ result: method }) => ({
        method: nonNullish(method) ? encodeAuditFieldsResponse(method) : method,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["VatMethods"]["Select"]>({
      store: (args) => DbCollectionVatMethods.create(args),
      resourceKey: "vat+method",
      build: ({ result: method }) => ({
        method: encodeAuditFieldsResponse(method),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["VatMethods"]["Select"],
      Records["Core"]["VatMethods"]["Select"]["id"]
    >({
      store: (args) => DbVatMethods.create(args),
      resourceKey: "vat+method",
      build: ({ result: method }) => ({
        method: encodeAuditFieldsResponse(method),
      }),
      pKeySchema: ApiSchema.VatMethods.GetVatMethodsRequestSchema.shape.id,
    }),
  };
}
