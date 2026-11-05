import { DbCollectionSystemAccounts, DbSystemAccounts } from "@usenullish/nullish-engine/ledger";
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
  spec: { tag: "System Accounts" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/system-accounts",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/system-accounts",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.SystemAccounts.GetSystemAccountsFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.SystemAccounts.GetSystemAccountsResponseSchema },
    description: "Retrieve a list of system accounts",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.SystemAccounts.GetSystemAccountResponseSchema },
    description: "Get a system account",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.SystemAccounts.CreateSystemAccountRequestSchema },
  },
  response: {
    body: {
      schema: ApiSchema.SystemAccounts.CreateSystemAccountResponseSchema,
    },
    description: "Create a system account",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.SystemAccounts.UpdateSystemAccountRequestSchema },
  },
  response: {
    body: {
      schema: ApiSchema.SystemAccounts.UpdateSystemAccountResponseSchema,
    },
    description: "Update a system account",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class SystemAccountsHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): SystemAccountsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Ledger"]["SystemAccounts"]["Select"],
      Records["Ledger"]["SystemAccounts"]["Filter"]
    >({
      store: (args) => DbCollectionSystemAccounts.create(args),
      resourceKey: "accounts",
      filtersSchema: ApiSchema.SystemAccounts.GetSystemAccountsFiltersQuerySchema,
      build: ({ result: accounts }) => ({
        accounts: accounts.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Ledger"]["SystemAccounts"]["Select"]>({
      store: (args) => DbSystemAccounts.create(args),
      resourceKey: "account",
      build: ({ result: account }) => ({
        account: nonNullish(account) ? encodeAuditFieldsResponse(account) : account,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Ledger"]["SystemAccounts"]["Select"]>({
      store: (args) => DbCollectionSystemAccounts.create(args),
      resourceKey: "account",
      build: ({ result: account }) => ({
        account: encodeAuditFieldsResponse(account),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Ledger"]["SystemAccounts"]["Select"],
      Records["Ledger"]["SystemAccounts"]["Select"]["id"]
    >({
      store: (args) => DbSystemAccounts.create(args),
      resourceKey: "account",
      build: ({ result: account }) => ({
        account: encodeAuditFieldsResponse(account),
      }),
      pKeySchema: ApiSchema.SystemAccounts.GetSystemAccountsRequestSchema.shape.id,
    }),
  };
}
