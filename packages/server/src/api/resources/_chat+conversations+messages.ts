import { encodeWithCodecs } from "@usenullish/nullish-common";
import { DbCollectionMessages } from "@usenullish/nullish-engine/chat";
import { ApiSchema, CommonSchema } from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { defineChildListHandler } from "../handlers/child/list";
import type { DefineOpenAPIHandler } from "../types/openapi";

const route = {
  spec: { tag: "Chat" },
  path: "/chat/conversations/{parentId}/messages",
} as const;

const listRoute = defineListRoute({
  ...route,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.Messages.GetMessagesFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Messages.GetMessagesResponseSchema },
    description: "Retrieve a list of messages of a conversation of the signed-in user",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class MessagesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): MessagesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#defineList });
  }

  #defineList: DefineOpenAPIHandler<ListRoute> = defineChildListHandler<
    ListRoute,
    Records["Chat"]["Messages"]["Select"],
    Records["Chat"]["Messages"]["Filter"]
  >({
    store: (args) => DbCollectionMessages.create(args),
    resourceKey: "messages",
    filtersSchema: ApiSchema.Messages.GetMessagesFiltersQuerySchema,
    build: ({ result: messages }) =>
      encodeWithCodecs({
        schema: ApiSchema.Messages.GetMessagesResponseSchema,
        value: { messages },
      }),
  });
}
