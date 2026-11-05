import { CreateInvitationService } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeInvitationResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { definePostRoute } from "./_factories/crud-route-config";
import { _defineCreateHandler } from "../handlers/_create";

type Invitation = Records["Core"]["Invitations"]["Select"];

const createRoute = definePostRoute({
  spec: { tag: "Invitations" },
  path: "/organizations/{parentId}/invitations",
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.InvitationsCreate.CreateInvitationRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.InvitationsCreate.CreateInvitationResponseSchema },
    description:
      "Invite a person by email with a role. Only admins invite. The token is returned once, to share as a link, and expires after 7 days.",
  },
});

type CreateRoute = typeof createRoute;

@ResourceProvider
export class InvitationsCreateHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [createRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvitationsCreateHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: createRoute, handler: this.#create });
  }

  readonly #create = _defineCreateHandler<CreateRoute, { invitation: Invitation; token: string }>({
    insert: async ({ db, userId, context, values }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await CreateInvitationService.create({
        db,
        userId,
        organizationId: parentId,
        values,
      }).create();
    },
    resourceKey: "invitation",
    build: ({ result: { invitation, token } }) => ({
      invitation: encodeInvitationResponse(invitation),
      token,
    }),
  });
}
