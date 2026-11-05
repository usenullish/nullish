import { isInvalidUuid } from "@usenullish/nullish-common";
import { CreateJournalService } from "@usenullish/nullish-engine/ledger";
import { ApiSchema, CommonSchema, encodeJournalResponse } from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { definePostRoute } from "./_factories/crud-route-config";
import { _defineCreateHandler } from "../handlers/_create";

const createRoute = definePostRoute({
  path: "/organizations/{parentId}/accounting/journal",
  spec: { tag: "Journal" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.Journal.CreateJournalEntryRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Journal.CreateJournalEntryResponseSchema },
    description: "Create a journal entry",
  },
});

type CreateRoute = typeof createRoute;

@ResourceProvider
export class JournalCreateHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [createRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): JournalCreateHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: createRoute, handler: this.#create });
  }

  readonly #create = _defineCreateHandler<CreateRoute, Composites["Journal"]["Select"]>({
    insert: async ({ db, userId, context, values }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await CreateJournalService.create({
        db,
        userId,
        organizationId: parentId,
      }).create({
        values,
      });
    },
    resourceKey: "journal",
    build: ({ result: journalEntry }) => ({
      journalEntry: encodeJournalResponse(journalEntry),
    }),
  });
}
