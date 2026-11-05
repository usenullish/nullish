import { DbCollectionInvoices, DbInvoices } from "@usenullish/nullish-engine/billing";
import { ApiSchema, CommonSchema, encodeInvoiceResponse } from "@usenullish/nullish-schema/server";
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
  spec: { tag: "Invoices" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/billing/invoices",
} as const;

const rootRoute = {
  ...route,
  path: "/billing/invoices",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.Invoices.GetInvoicesFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Invoices.GetInvoicesResponseSchema },
    description: "Retrieve a list of invoices",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.Invoices.GetInvoiceResponseSchema },
    description: "Get an invoice",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.Invoices.CreateInvoiceRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Invoices.CreateInvoiceResponseSchema },
    description: "Create an invoice",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.Invoices.UpdateInvoiceRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Invoices.UpdateInvoiceResponseSchema },
    description: "Update an invoice",
  },
});

type UpdateRoute = typeof updateRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a draft invoice",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class InvoicesHandlers extends CrudResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
  delete: DeleteRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoicesHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Billing"]["Invoices"]["Select"],
      Records["Billing"]["Invoices"]["Filter"]
    >({
      store: (args) => DbCollectionInvoices.create(args),
      resourceKey: "invoices",
      filtersSchema: ApiSchema.Invoices.GetInvoicesFiltersQuerySchema,
      build: ({ result: invoices }) => ({
        invoices: invoices.map(encodeInvoiceResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Billing"]["Invoices"]["Select"]>({
      store: (args) => DbInvoices.create(args),
      resourceKey: "invoice",
      build: ({ result: invoice }) => ({
        invoice: nonNullish(invoice) ? encodeInvoiceResponse(invoice) : invoice,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Billing"]["Invoices"]["Select"]>({
      store: (args) => DbCollectionInvoices.create(args),
      resourceKey: "invoice",
      build: ({ result: invoice }) => ({
        invoice: encodeInvoiceResponse(invoice),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Billing"]["Invoices"]["Select"],
      Records["Billing"]["Invoices"]["Select"]["id"]
    >({
      store: (args) => DbInvoices.create(args),
      resourceKey: "invoice",
      build: ({ result: invoice }) => ({
        invoice: encodeInvoiceResponse(invoice),
      }),
      pKeySchema: ApiSchema.Invoices.GetInvoicesRequestSchema.shape.id,
    }),
  };

  protected override readonly defineDelete = {
    route: deleteRoute,
    handler: defineDeleteHandler<
      DeleteRoute,
      Records["Billing"]["Invoices"]["Select"],
      Records["Billing"]["Invoices"]["Select"]["id"]
    >({
      store: (args) => DbInvoices.create(args),
      resourceKey: "invoice",
      pKeySchema: ApiSchema.Invoices.GetInvoicesRequestSchema.shape.id,
    }),
  };
}
