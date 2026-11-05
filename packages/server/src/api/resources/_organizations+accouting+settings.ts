import {
  DbAccountingSettings,
  DbCollectionAccountingSettings,
} from "@usenullish/nullish-engine/core";
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
  spec: { tag: "Accounting Settings" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/settings",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/settings",
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
      schema: ApiSchema.AccountingSettings.GetAccountingSettingsResponseSchema,
    },
    description: "Retrieve a list of accounting settings",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: {
      schema: ApiSchema.AccountingSettings.GetAccountingSettingResponseSchema,
    },
    description: "Get an accounting setting",
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
      schema: ApiSchema.AccountingSettings.CreateAccountingSettingRequestSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.AccountingSettings.CreateAccountingSettingResponseSchema,
    },
    description: "Create an accounting setting",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: {
      schema: ApiSchema.AccountingSettings.UpdateAccountingSettingRequestSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.AccountingSettings.UpdateAccountingSettingResponseSchema,
    },
    description: "Update an accounting setting",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class AccountingSettingsHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): AccountingSettingsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<ListRoute, Records["Core"]["AccountingSettings"]["Select"]>({
      store: (args) => DbCollectionAccountingSettings.create(args),
      resourceKey: "accounting+settings",
      build: ({ result: settings }) => ({
        settings: settings.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["AccountingSettings"]["Select"]>({
      store: (args) => DbAccountingSettings.create(args),
      resourceKey: "accounting+setting",
      build: ({ result: setting }) => ({
        setting: nonNullish(setting) ? encodeAuditFieldsResponse(setting) : setting,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["AccountingSettings"]["Select"]>(
      {
        store: (args) => DbCollectionAccountingSettings.create(args),
        resourceKey: "accounting+setting",
        build: ({ result: setting }) => ({
          setting: encodeAuditFieldsResponse(setting),
        }),
      },
    ),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["AccountingSettings"]["Select"],
      Records["Core"]["AccountingSettings"]["Select"]["id"]
    >({
      store: (args) => DbAccountingSettings.create(args),
      resourceKey: "accounting+setting",
      build: ({ result: setting }) => ({
        setting: encodeAuditFieldsResponse(setting),
      }),
      pKeySchema: ApiSchema.AccountingSettings.GetAccountingSettingsRequestSchema.shape.id,
    }),
  };
}
