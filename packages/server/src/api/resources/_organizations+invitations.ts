import { DbCollectionInvitations, DbInvitations } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeInvitationResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineDeleteRoute, defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";
import { defineDeleteHandler } from "../handlers/root/delete";

type Invitation = Records["Core"]["Invitations"]["Select"];

const route = {
  spec: { tag: "Invitations" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/invitations",
} as const;

const rootRoute = {
  ...route,
  path: "/invitations",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.Invitations.GetInvitationsResponseSchema },
    description: "Retrieve the pending invitations of an organization. Only admins see them.",
  },
});

type ListRoute = typeof listRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Revoke a pending invitation. Only admins revoke.",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class InvitationsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [childRoute.path, rootRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvitationsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
    this.registerRoute({ route: deleteRoute, handler: this.#delete });
  }

  readonly #list = _defineListHandler<ListRoute, Invitation>({
    query: async ({ db, userId, context, pagination, sort }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      const store: Pick<
        DbCollectionStore<Invitation, never, string>,
        "list"
      > = DbCollectionInvitations.create({
        db,
        userId,
        foreignKeyId: parentId,
      });

      return await store.list({ pagination, sort });
    },
    resourceKey: "invitations",
    build: ({ result: invitations }) => ({
      invitations: invitations.map(encodeInvitationResponse),
    }),
  });

  readonly #delete = defineDeleteHandler<DeleteRoute, Invitation, Invitation["id"]>({
    store: (args) => DbInvitations.create(args),
    resourceKey: "invitation",
    pKeySchema: ApiSchema.Invitations.InvitationSchema.shape.id,
  });
}
