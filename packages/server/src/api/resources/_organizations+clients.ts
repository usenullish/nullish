import { DbClients, DbCollectionClients } from "@usenullish/nullish-engine/billing";
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
  spec: { tag: "Clients" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/billing/clients",
} as const;

const rootRoute = {
  ...route,
  path: "/billing/clients",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.Clients.GetClientsFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Clients.GetClientsResponseSchema },
    description: "Retrieve a list of clients",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.Clients.GetClientResponseSchema },
    description: "Get a client",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.Clients.CreateClientRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Clients.CreateClientResponseSchema },
    description: "Create a client",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.Clients.UpdateClientRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Clients.UpdateClientResponseSchema },
    description: "Update a client",
  },
});

type UpdateRoute = typeof updateRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a client",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class ClientsHandlers extends CrudResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
  delete: DeleteRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): ClientsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Billing"]["Clients"]["Select"],
      Records["Billing"]["Clients"]["Filter"]
    >({
      store: (args) => DbCollectionClients.create(args),
      resourceKey: "clients",
      filtersSchema: ApiSchema.Clients.GetClientsFiltersQuerySchema,
      build: ({ result: clients }) => ({
        clients: clients.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Billing"]["Clients"]["Select"]>({
      store: (args) => DbClients.create(args),
      resourceKey: "client",
      build: ({ result: client }) => ({
        client: nonNullish(client) ? encodeAuditFieldsResponse(client) : client,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Billing"]["Clients"]["Select"]>({
      store: (args) => DbCollectionClients.create(args),
      resourceKey: "client",
      build: ({ result: client }) => ({
        client: encodeAuditFieldsResponse(client),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Billing"]["Clients"]["Select"],
      Records["Billing"]["Clients"]["Select"]["id"]
    >({
      store: (args) => DbClients.create(args),
      resourceKey: "client",
      build: ({ result: client }) => ({
        client: encodeAuditFieldsResponse(client),
      }),
      pKeySchema: ApiSchema.Clients.GetClientsRequestSchema.shape.id,
    }),
  };

  protected override readonly defineDelete = {
    route: deleteRoute,
    handler: defineDeleteHandler<
      DeleteRoute,
      Records["Billing"]["Clients"]["Select"],
      Records["Billing"]["Clients"]["Select"]["id"]
    >({
      store: (args) => DbClients.create(args),
      resourceKey: "client",
      pKeySchema: ApiSchema.Clients.GetClientsRequestSchema.shape.id,
    }),
  };
}
