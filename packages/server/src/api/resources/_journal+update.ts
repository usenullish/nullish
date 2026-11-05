import { UpdateJournalService } from "@usenullish/nullish-engine/ledger";
import { ApiSchema, encodeJournalResponse } from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { definePatchRoute } from "./_factories/crud-route-config";
import { _defineUpdateHandler } from "../handlers/_update";

const updateRoute = definePatchRoute({
  path: "/accounting/journal",
  spec: { tag: "Journal" },
  request: {
    body: { schema: ApiSchema.Journal.UpdateJournalEntryRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Journal.UpdateJournalEntryResponseSchema },
    description: "Update a journal entry",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class JournalUpdateHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: ["/accounting/journal"], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): JournalUpdateHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: updateRoute, handler: this.#update });
  }

  readonly #update = _defineUpdateHandler<
    UpdateRoute,
    Composites["Journal"]["Select"],
    Composites["Journal"]["Select"]["entry"]["id"]
  >({
    update: async ({ db, userId, values, pKey }) =>
      await UpdateJournalService.create({ db, userId, journalId: pKey }).update({ values }),
    pKeySchema: ApiSchema.Journal.GetJournalEntriesRequestSchema.shape.entry.shape.id,
    resourceKey: "journal",
    build: ({ result: journalEntry }) => ({
      journalEntry: encodeJournalResponse(journalEntry),
    }),
  });
}
