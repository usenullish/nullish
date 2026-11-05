import { DbOrganizations } from "@usenullish/nullish-engine/core";
import { ApiSchema, encodeOrganizationResponse } from "@usenullish/nullish-schema/server";
import { defineListHandler } from "../handlers/root/list";
import { defineCreateHandler } from "../handlers/root/create";
import { defineUpdateHandler } from "../handlers/root/update";
import { defineGetByIdHandler } from "../handlers/root/get-by-id";
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

const route = {
  path: "/organizations",
  spec: { tag: "Organizations" },
} as const;

const listRoute = defineListRoute({
  ...route,
  request: {
    query: { filters: { schema: ApiSchema.Organizations.GetOrganizationsFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Organizations.GetOrganizationsResponseSchema },
    description: "Retrieve a list of organizations",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...route,
  response: {
    body: { schema: ApiSchema.Organizations.GetOrganizationResponseSchema },
    description: "Get an organization",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...route,
  response: {
    body: { schema: ApiSchema.Organizations.CreateOrganizationResponseSchema },
    description: "Create an organization",
  },
  request: {
    body: { schema: ApiSchema.Organizations.CreateOrganizationRequestSchema },
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...route,
  response: {
    body: { schema: ApiSchema.Organizations.UpdateOrganizationResponseSchema },
    description: "Update an organization",
  },
  request: {
    body: { schema: ApiSchema.Organizations.UpdateOrganizationRequestSchema },
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class OrganizationsHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineListHandler<
      ListRoute,
      Records["Core"]["Organizations"]["Select"],
      Records["Core"]["Organizations"]["Filter"]
    >({
      store: (args) => DbOrganizations.create(args),
      resourceKey: "organizations",
      filtersSchema: ApiSchema.Organizations.GetOrganizationsFiltersQuerySchema,
      build: ({ result: organizations }) => ({
        organizations: organizations.map(encodeOrganizationResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["Organizations"]["Select"]>({
      store: (args) => DbOrganizations.create(args),
      resourceKey: "organization",
      build: ({ result: organization }) => ({
        organization: nonNullish(organization)
          ? encodeOrganizationResponse(organization)
          : organization,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineCreateHandler<CreateRoute, Records["Core"]["Organizations"]["Select"]>({
      store: (args) => DbOrganizations.create(args),
      resourceKey: "organization",
      build: ({ result: organization }) => ({
        organization: encodeOrganizationResponse(organization),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["Organizations"]["Select"],
      Records["Core"]["Organizations"]["Select"]["id"]
    >({
      store: (args) => DbOrganizations.create(args),
      resourceKey: "organization",
      build: ({ result: organization }) => ({
        organization: encodeOrganizationResponse(organization),
      }),
      pKeySchema: ApiSchema.Organizations.GetOrganizationsRequestSchema.shape.id,
    }),
  };
}
