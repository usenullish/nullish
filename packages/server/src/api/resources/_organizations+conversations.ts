import { DbCollectionConversations } from "@usenullish/nullish-engine/chat";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";

type Conversation = Records["Chat"]["Conversations"]["Select"];

const route = {
  spec: { tag: "Chat" },
  path: "/organizations/{parentId}/conversations",
} as const;

const listRoute = defineListRoute({
  ...route,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.Conversations.GetConversationsResponseSchema },
    description: "Retrieve the conversations of the signed-in user in an organization",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class OrganizationConversationsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationConversationsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
  }

  readonly #list = _defineListHandler<ListRoute, Conversation>({
    query: async ({ db, userId, context, pagination, sort }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      const store: Pick<
        DbCollectionStore<Conversation, never, string>,
        "list"
      > = DbCollectionConversations.create({
        db,
        userId,
        foreignKeyId: parentId,
      });

      return await store.list({ pagination, sort });
    },
    resourceKey: "conversations",
    build: ({ result: conversations }) => ({
      conversations: conversations.map(encodeAuditFieldsResponse),
    }),
  });
}
