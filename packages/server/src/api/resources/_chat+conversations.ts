import { nonNullish, encodeWithCodecs } from "@usenullish/nullish-common";
import { DbChat, DbConversations } from "@usenullish/nullish-engine/chat";
import { ApiSchema, encodeAuditFieldsResponse } from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import {
  defineDeleteRoute,
  defineGetByIdRoute,
  defineListRoute,
} from "./_factories/crud-route-config";
import { defineListHandler } from "../handlers/root/list";
import { _defineGetByIdHandler } from "../handlers/_get-by-id";
import { defineDeleteHandler } from "../handlers/root/delete";
import type { DefineOpenAPIHandler } from "../types/openapi";

const route = {
  spec: { tag: "Chat" },
  path: "/chat/conversations",
} as const;

const listRoute = defineListRoute({
  ...route,
  response: {
    body: { schema: ApiSchema.Conversations.GetConversationsResponseSchema },
    description: "Retrieve the conversations of the signed-in user that belong to no organization",
  },
});

const getByIdRoute = defineGetByIdRoute({
  ...route,
  response: {
    body: { schema: ApiSchema.Conversations.GetConversationResponseSchema },
    description: "Get a conversation of the signed-in user",
  },
});

const deleteRoute = defineDeleteRoute({
  ...route,
  response: {
    description: "Delete a conversation of the signed-in user with its messages",
  },
});

type ListRoute = typeof listRoute;
type GetByIdRoute = typeof getByIdRoute;
type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class ConversationsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): ConversationsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#defineList });
    this.registerRoute({ route: getByIdRoute, handler: this.#defineGetById });
    this.registerRoute({ route: deleteRoute, handler: this.#defineDelete });
  }

  #defineList: DefineOpenAPIHandler<ListRoute> = defineListHandler<
    ListRoute,
    Records["Chat"]["Conversations"]["Select"]
  >({
    store: (args) => DbConversations.create(args),
    resourceKey: "conversations",
    build: ({ result: conversations }) => ({
      conversations: conversations.map(encodeAuditFieldsResponse),
    }),
  });

  #defineGetById: DefineOpenAPIHandler<GetByIdRoute> = _defineGetByIdHandler<
    GetByIdRoute,
    Composites["Chat"]["Select"]
  >({
    query: async ({ db, userId, id }) => await DbChat.create({ db, userId }).find({ pKey: id }),
    resourceKey: "conversation",
    build: ({ result: chat }) => ({
      chat: nonNullish(chat)
        ? encodeWithCodecs({ schema: ApiSchema.Conversations.ChatSchema, value: chat })
        : chat,
    }),
  });

  #defineDelete: DefineOpenAPIHandler<DeleteRoute> = defineDeleteHandler<
    DeleteRoute,
    Records["Chat"]["Conversations"]["Select"],
    Records["Chat"]["Conversations"]["Select"]["id"]
  >({
    store: (args) => DbConversations.create(args),
    resourceKey: "conversation",
    pKeySchema: ApiSchema.Conversations.ConversationSchema.shape.id,
  });
}
