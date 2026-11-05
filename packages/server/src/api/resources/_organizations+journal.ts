import { DbCollectionJournal, DbJournal } from "@usenullish/nullish-engine/ledger";
import { ApiSchema, CommonSchema, encodeJournalResponse } from "@usenullish/nullish-schema/server";
import { nonNullish } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { Composites } from "@usenullish/nullish-schema/composites";
import {
  defineGetByIdRoute,
  defineListRoute,
  defineDeleteRoute,
} from "./_factories/crud-route-config";
import { defineChildListHandler } from "../handlers/child/list";
import { defineGetByIdHandler } from "../handlers/root/get-by-id";
import { defineDeleteHandler } from "../handlers/root/delete";

const route = {
  spec: { tag: "Journal" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/journal",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/journal",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.Journal.GetJournalEntriesFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Journal.GetJournalEntriesResponseSchema },
    description: "Retrieve a list of journal entries",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.Journal.GetJournalEntryResponseSchema },
    description: "Get a journal entry",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a journal entry with its postings",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class JournalsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): JournalsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
    this.registerRoute({ route: getByIdRoute, handler: this.#getById });
    this.registerRoute({ route: deleteRoute, handler: this.#delete });
  }

  readonly #list = defineChildListHandler<
    ListRoute,
    Composites["Journal"]["Select"],
    Composites["Journal"]["Filter"]
  >({
    store: (args) => DbCollectionJournal.create(args),
    resourceKey: "journals",
    filtersSchema: ApiSchema.Journal.GetJournalEntriesFiltersQuerySchema,
    build: ({ result: journalEntries }) => ({
      journalEntries: journalEntries.map(encodeJournalResponse),
    }),
  });

  readonly #getById = defineGetByIdHandler<GetByIdRoute, Composites["Journal"]["Select"]>({
    store: (args) => DbJournal.create(args),
    resourceKey: "journal",
    build: ({ result: journalEntry }) => ({
      journalEntry: nonNullish(journalEntry) ? encodeJournalResponse(journalEntry) : journalEntry,
    }),
  });

  readonly #delete = defineDeleteHandler<
    DeleteRoute,
    Composites["Journal"]["Select"],
    Composites["Journal"]["Select"]["entry"]["id"]
  >({
    store: (args) => DbJournal.create(args),
    resourceKey: "journal",
    pKeySchema: ApiSchema.Journal.GetJournalEntriesRequestSchema.shape.entry.shape.id,
  });
}
