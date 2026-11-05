import { DbCollectionContacts, DbContacts } from "@usenullish/nullish-engine/billing";
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
  spec: { tag: "Client Contacts" },
} as const;

const childRoute = {
  ...route,
  path: "/billing/clients/{parentId}/contacts",
} as const;

const rootRoute = {
  ...route,
  path: "/billing/contacts",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.Contacts.GetContactsFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Contacts.GetContactsResponseSchema },
    description: "Retrieve a list of client contacts",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.Contacts.GetContactResponseSchema },
    description: "Get a client contact",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.Contacts.CreateContactRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Contacts.CreateContactResponseSchema },
    description: "Create a client contact",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.Contacts.UpdateContactRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Contacts.UpdateContactResponseSchema },
    description: "Update a client contact",
  },
});

type UpdateRoute = typeof updateRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a contact",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class ContactsHandlers extends CrudResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
  delete: DeleteRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): ContactsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Billing"]["Contacts"]["Select"],
      Records["Billing"]["Contacts"]["Filter"]
    >({
      store: (args) => DbCollectionContacts.create(args),
      resourceKey: "contacts",
      filtersSchema: ApiSchema.Contacts.GetContactsFiltersQuerySchema,
      build: ({ result: contacts }) => ({
        contacts: contacts.map(encodeAuditFieldsResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Billing"]["Contacts"]["Select"]>({
      store: (args) => DbContacts.create(args),
      resourceKey: "contact",
      build: ({ result: contact }) => ({
        contact: nonNullish(contact) ? encodeAuditFieldsResponse(contact) : contact,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Billing"]["Contacts"]["Select"]>({
      store: (args) => DbCollectionContacts.create(args),
      resourceKey: "contact",
      build: ({ result: contact }) => ({
        contact: encodeAuditFieldsResponse(contact),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Billing"]["Contacts"]["Select"],
      Records["Billing"]["Contacts"]["Select"]["id"]
    >({
      store: (args) => DbContacts.create(args),
      resourceKey: "contact",
      build: ({ result: contact }) => ({
        contact: encodeAuditFieldsResponse(contact),
      }),
      pKeySchema: ApiSchema.Contacts.GetContactsRequestSchema.shape.id,
    }),
  };

  protected override readonly defineDelete = {
    route: deleteRoute,
    handler: defineDeleteHandler<
      DeleteRoute,
      Records["Billing"]["Contacts"]["Select"],
      Records["Billing"]["Contacts"]["Select"]["id"]
    >({
      store: (args) => DbContacts.create(args),
      resourceKey: "contact",
      pKeySchema: ApiSchema.Contacts.GetContactsRequestSchema.shape.id,
    }),
  };
}
