import { DbBillingSettings, DbCollectionBillingSettings } from "@usenullish/nullish-engine/core";
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
  spec: { tag: "Billing Settings" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/billing/settings",
} as const;

const rootRoute = {
  ...route,
  path: "/billing/settings",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.BillingSettings.GetBillingSettingsResponseSchema,
    },
    description: "Retrieve a list of billing settings",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: {
      schema: ApiSchema.BillingSettings.GetBillingSettingResponseSchema,
    },
    description: "Get a billing setting",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: {
      schema: ApiSchema.BillingSettings.CreateBillingSettingRequestSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.BillingSettings.CreateBillingSettingResponseSchema,
    },
    description: "Create a billing setting",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: {
      schema: ApiSchema.BillingSettings.UpdateBillingSettingRequestSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.BillingSettings.UpdateBillingSettingResponseSchema,
    },
    description: "Update a billing setting",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class BillingSettingsHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): BillingSettingsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<ListRoute, Records["Core"]["BillingSettings"]["Select"]>({
      store: (args) => DbCollectionBillingSettings.create(args),
      resourceKey: "billing+settings",
      build: ({ result: settings }) => ({
        settings: settings.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["BillingSettings"]["Select"]>({
      store: (args) => DbBillingSettings.create(args),
      resourceKey: "billing+setting",
      build: ({ result: setting }) => ({
        setting: nonNullish(setting) ? encodeAuditFieldsResponse(setting) : setting,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["BillingSettings"]["Select"]>({
      store: (args) => DbCollectionBillingSettings.create(args),
      resourceKey: "billing+setting",
      build: ({ result: setting }) => ({
        setting: encodeAuditFieldsResponse(setting),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["BillingSettings"]["Select"],
      Records["Core"]["BillingSettings"]["Select"]["id"]
    >({
      store: (args) => DbBillingSettings.create(args),
      resourceKey: "billing+setting",
      build: ({ result: setting }) => ({
        setting: encodeAuditFieldsResponse(setting),
      }),
      pKeySchema: ApiSchema.BillingSettings.GetBillingSettingsRequestSchema.shape.id,
    }),
  };
}
