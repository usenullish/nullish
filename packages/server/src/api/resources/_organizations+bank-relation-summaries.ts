import { DbCollectionBankRelationSummaries } from "@usenullish/nullish-engine/banking";
import {
  ApiSchema,
  CommonSchema,
  encodeBankRelationSummaryResponse,
} from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";

type SelectBankRelationSummaries = Composites["BankRelationSummaries"]["Select"];

const listRoute = defineListRoute({
  spec: { tag: "Bank relation summaries" },
  path: "/organizations/{parentId}/banking/relation-summaries",
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.BankRelationSummaries.GetBankRelationSummariesResponseSchema },
    description: "Retrieve a list of bank relations with their movements to reconcile",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class BankRelationSummariesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): BankRelationSummariesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
  }

  readonly #list = _defineListHandler<ListRoute, SelectBankRelationSummaries>({
    query: async ({ db, userId, context, pagination, sort }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await DbCollectionBankRelationSummaries.create({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort });
    },
    resourceKey: "bankRelationSummaries",
    build: ({ result: bankRelationSummaries }) => ({
      bankRelationSummaries: bankRelationSummaries.map(encodeBankRelationSummaryResponse),
    }),
  });
}
