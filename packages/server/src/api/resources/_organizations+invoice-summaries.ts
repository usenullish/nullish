import {
  DbCollectionInvoiceSummaries,
  DbInvoiceSummaries,
} from "@usenullish/nullish-engine/billing";
import {
  ApiSchema,
  CommonSchema,
  encodeInvoiceSummaryResponse,
} from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { isInvalidUuid, nonNullish } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineGetByIdRoute, defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";
import { _defineGetByIdHandler } from "../handlers/_get-by-id";

type SelectInvoiceSummaries = Composites["InvoiceSummaries"]["Select"];
type FilterInvoiceSummaries = Composites["InvoiceSummaries"]["Filter"];

const route = {
  spec: { tag: "Invoice summaries" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/billing/invoice-summaries",
} as const;

const rootRoute = {
  ...route,
  path: "/billing/invoice-summaries",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      filters: { schema: ApiSchema.InvoiceSummaries.GetInvoiceSummariesFiltersQuerySchema },
    },
  },
  response: {
    body: { schema: ApiSchema.InvoiceSummaries.GetInvoiceSummariesResponseSchema },
    description: "Retrieve a list of invoices with their amounts",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.InvoiceSummaries.GetInvoiceSummaryResponseSchema },
    description: "Get an invoice with its amounts",
  },
});

type GetByIdRoute = typeof getByIdRoute;

@ResourceProvider
export class InvoiceSummariesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoiceSummariesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
    this.registerRoute({ route: getByIdRoute, handler: this.#getById });
  }

  readonly #list = _defineListHandler<ListRoute, SelectInvoiceSummaries, FilterInvoiceSummaries>({
    query: async ({ db, userId, context, pagination, sort, filters }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await DbCollectionInvoiceSummaries.create({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort, filters });
    },
    resourceKey: "invoiceSummaries",
    filtersSchema: ApiSchema.InvoiceSummaries.GetInvoiceSummariesFiltersQuerySchema,
    build: ({ result: invoiceSummaries }) => ({
      invoiceSummaries: invoiceSummaries.map(encodeInvoiceSummaryResponse),
    }),
  });

  readonly #getById = _defineGetByIdHandler<GetByIdRoute, SelectInvoiceSummaries>({
    query: async ({ db, userId, id }) =>
      await DbInvoiceSummaries.create({ db, userId }).find({ pKey: id }),
    resourceKey: "invoiceSummary",
    build: ({ result: invoiceSummary }) => ({
      invoiceSummary: nonNullish(invoiceSummary)
        ? encodeInvoiceSummaryResponse(invoiceSummary)
        : invoiceSummary,
    }),
  });
}
