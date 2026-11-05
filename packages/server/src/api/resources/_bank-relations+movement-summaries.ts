import { DbCollectionMovementSummaries } from "@usenullish/nullish-engine/banking";
import {
  ApiSchema,
  CommonSchema,
  encodeBankMovementSummaryResponse,
} from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";

type SelectMovementSummaries = Composites["MovementSummaries"]["Select"];
type FilterMovementSummaries = Composites["MovementSummaries"]["Filter"];

const listRoute = defineListRoute({
  spec: { tag: "Bank movement summaries" },
  path: "/banking/relations/{parentId}/movement-summaries",
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      filters: {
        schema: ApiSchema.BankMovementSummaries.GetBankMovementSummariesFiltersQuerySchema,
      },
    },
  },
  response: {
    body: { schema: ApiSchema.BankMovementSummaries.GetBankMovementSummariesResponseSchema },
    description:
      "Retrieve the movements of a bank relation, each with the open invoice suggested by its payment reference",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class BankMovementSummariesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): BankMovementSummariesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
  }

  readonly #list = _defineListHandler<ListRoute, SelectMovementSummaries, FilterMovementSummaries>({
    query: async ({ db, userId, context, pagination, sort, filters }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await DbCollectionMovementSummaries.create({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort, filters });
    },
    resourceKey: "bankMovementSummaries",
    filtersSchema: ApiSchema.BankMovementSummaries.GetBankMovementSummariesFiltersQuerySchema,
    build: ({ result: bankMovementSummaries }) => ({
      bankMovementSummaries: bankMovementSummaries.map(encodeBankMovementSummaryResponse),
    }),
  });
}
