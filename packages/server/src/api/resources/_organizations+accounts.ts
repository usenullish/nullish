import { DbAccounts, DbCollectionAccounts } from "@usenullish/nullish-engine/ledger";
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
  spec: { tag: "Accounts" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/accounts",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/accounts",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.Accounts.GetAccountsFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Accounts.GetAccountsResponseSchema },
    description: "Retrieve a list of accounts",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.Accounts.GetAccountResponseSchema },
    description: "Get an account",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.Accounts.CreateAccountRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Accounts.CreateAccountResponseSchema },
    description: "Create an account",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.Accounts.UpdateAccountRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Accounts.UpdateAccountResponseSchema },
    description: "Update an account",
  },
});

type UpdateRoute = typeof updateRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete an account",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class AccountsHandlers extends CrudResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
  delete: DeleteRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): AccountsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Ledger"]["Accounts"]["Select"],
      Records["Ledger"]["Accounts"]["Filter"]
    >({
      store: (args) => DbCollectionAccounts.create(args),
      resourceKey: "accounts",
      filtersSchema: ApiSchema.Accounts.GetAccountsFiltersQuerySchema,
      build: ({ result: accounts }) => ({
        accounts: accounts.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Ledger"]["Accounts"]["Select"]>({
      store: (args) => DbAccounts.create(args),
      resourceKey: "account",
      build: ({ result: account }) => ({
        account: nonNullish(account) ? encodeAuditFieldsResponse(account) : account,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Ledger"]["Accounts"]["Select"]>({
      store: (args) => DbCollectionAccounts.create(args),
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
      Records["Ledger"]["Accounts"]["Select"],
      Records["Ledger"]["Accounts"]["Select"]["id"]
    >({
      store: (args) => DbAccounts.create(args),
      resourceKey: "account",
      build: ({ result: account }) => ({
        account: encodeAuditFieldsResponse(account),
      }),
      pKeySchema: ApiSchema.Accounts.GetAccountsRequestSchema.shape.id,
    }),
  };

  protected override readonly defineDelete = {
    route: deleteRoute,
    handler: defineDeleteHandler<
      DeleteRoute,
      Records["Ledger"]["Accounts"]["Select"],
      Records["Ledger"]["Accounts"]["Select"]["id"]
    >({
      store: (args) => DbAccounts.create(args),
      resourceKey: "account",
      pKeySchema: ApiSchema.Accounts.GetAccountsRequestSchema.shape.id,
    }),
  };
}
