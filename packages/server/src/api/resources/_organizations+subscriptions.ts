import { DbCollectionSubscriptions } from "@usenullish/nullish-engine/subscription";
import {
  ApiSchema,
  CommonSchema,
  encodeSubscriptionResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { defineChildListHandler } from "../handlers/child/list";

const listRoute = defineListRoute({
  spec: { tag: "Subscriptions" },
  path: "/organizations/{parentId}/subscriptions",
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.Subscriptions.GetSubscriptionsResponseSchema },
    description: "Retrieve the subscription of an organization",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class SubscriptionsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): SubscriptionsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
  }

  readonly #list = defineChildListHandler<
    ListRoute,
    Records["Subscription"]["Subscriptions"]["Select"]
  >({
    store: (args) => DbCollectionSubscriptions.create(args),
    resourceKey: "subscriptions",
    build: ({ result: subscriptions }) => ({
      subscriptions: subscriptions.map(encodeSubscriptionResponse),
    }),
  });
}
