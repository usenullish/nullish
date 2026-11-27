import { DbCollectionSubscriptionSummaries } from "@usenullish/nullish-engine/subscription";
import {
  ApiSchema,
  CommonSchema,
  encodeSubscriptionSummaryResponse,
} from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";

type SelectSubscriptionSummaries = Composites["SubscriptionSummaries"]["Select"];

const listRoute = defineListRoute({
  spec: { tag: "Subscriptions" },
  path: "/organizations/{parentId}/subscription-summaries",
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.SubscriptionSummaries.GetSubscriptionSummariesResponseSchema },
    description: "Retrieve the subscription of an organization and the status of the organization",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class SubscriptionSummariesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): SubscriptionSummariesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
  }

  readonly #list = _defineListHandler<ListRoute, SelectSubscriptionSummaries>({
    query: async ({ db, userId, context, pagination, sort }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await DbCollectionSubscriptionSummaries.create({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort });
    },
    resourceKey: "subscriptionSummaries",
    build: ({ result: { data: subscriptionSummaries, pagination } }) => ({
      data: subscriptionSummaries.map(encodeSubscriptionSummaryResponse),
      pagination,
    }),
  });
}
