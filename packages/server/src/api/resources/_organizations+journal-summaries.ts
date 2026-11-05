import {
  DbCollectionJournalSummaries,
  DbJournalSummaries,
} from "@usenullish/nullish-engine/ledger";
import {
  ApiSchema,
  CommonSchema,
  encodeJournalSummaryResponse,
} from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { isInvalidUuid, nonNullish } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineGetByIdRoute, defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";
import { _defineGetByIdHandler } from "../handlers/_get-by-id";

type SelectJournalSummaries = Composites["JournalSummaries"]["Select"];
type FilterJournalSummaries = Composites["JournalSummaries"]["Filter"];

const route = {
  spec: { tag: "Journal summaries" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/journal-summaries",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/journal-summaries",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      filters: { schema: ApiSchema.JournalSummaries.GetJournalSummariesFiltersQuerySchema },
    },
  },
  response: {
    body: { schema: ApiSchema.JournalSummaries.GetJournalSummariesResponseSchema },
    description: "Retrieve a list of journal entries with their postings and the invoice they book",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.JournalSummaries.GetJournalSummaryResponseSchema },
    description: "Get a journal entry with its postings and the invoice it books",
  },
});

type GetByIdRoute = typeof getByIdRoute;

@ResourceProvider
export class JournalSummariesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): JournalSummariesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
    this.registerRoute({ route: getByIdRoute, handler: this.#getById });
  }

  readonly #list = _defineListHandler<ListRoute, SelectJournalSummaries, FilterJournalSummaries>({
    query: async ({ db, userId, context, pagination, sort, filters }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await DbCollectionJournalSummaries.create({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort, filters });
    },
    resourceKey: "journalSummaries",
    filtersSchema: ApiSchema.JournalSummaries.GetJournalSummariesFiltersQuerySchema,
    build: ({ result: journalSummaries }) => ({
      journalSummaries: journalSummaries.map(encodeJournalSummaryResponse),
    }),
  });

  readonly #getById = _defineGetByIdHandler<GetByIdRoute, SelectJournalSummaries>({
    query: async ({ db, userId, id }) =>
      await DbJournalSummaries.create({ db, userId }).find({ pKey: id }),
    resourceKey: "journalSummary",
    build: ({ result: journalSummary }) => ({
      journalSummary: nonNullish(journalSummary)
        ? encodeJournalSummaryResponse(journalSummary)
        : journalSummary,
    }),
  });
}
