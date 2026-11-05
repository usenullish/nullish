import { DbCollectionVatSettings, DbVatSettings } from "@usenullish/nullish-engine/core";
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
  spec: { tag: "VAT Settings" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/vat/settings",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/vat/settings",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.VatSettings.GetVatSettingsResponseSchema },
    description: "Retrieve a list of VAT settings",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.VatSettings.GetVatSettingResponseSchema },
    description: "Get a VAT setting",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.VatSettings.CreateVatSettingRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatSettings.CreateVatSettingResponseSchema },
    description: "Create a VAT setting",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.VatSettings.UpdateVatSettingRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatSettings.UpdateVatSettingResponseSchema },
    description: "Update a VAT setting",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class VatSettingsHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): VatSettingsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<ListRoute, Records["Core"]["VatSettings"]["Select"]>({
      store: (args) => DbCollectionVatSettings.create(args),
      resourceKey: "vat+settings",
      build: ({ result: settings }) => ({
        settings: settings.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["VatSettings"]["Select"]>({
      store: (args) => DbVatSettings.create(args),
      resourceKey: "vat+setting",
      build: ({ result: setting }) => ({
        setting: nonNullish(setting) ? encodeAuditFieldsResponse(setting) : setting,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["VatSettings"]["Select"]>({
      store: (args) => DbCollectionVatSettings.create(args),
      resourceKey: "vat+setting",
      build: ({ result: setting }) => ({
        setting: encodeAuditFieldsResponse(setting),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["VatSettings"]["Select"],
      Records["Core"]["VatSettings"]["Select"]["id"]
    >({
      store: (args) => DbVatSettings.create(args),
      resourceKey: "vat+setting",
      build: ({ result: setting }) => ({
        setting: encodeAuditFieldsResponse(setting),
      }),
      pKeySchema: ApiSchema.VatSettings.GetVatSettingsRequestSchema.shape.id,
    }),
  };
}
