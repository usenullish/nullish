import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { AcceptInvitationService } from "@usenullish/nullish-engine/core";
import { defineActionWithRequestBodyRoute } from "./_factories/action-route-config";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { OpenAPIHandlerContext, Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";

const route = defineActionWithRequestBodyRoute({
  spec: { tag: "Invitations" },
  path: "/invitations/accept",
  request: {
    body: { schema: ApiSchema.Invitations.InvitationTokenRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.InvitationsAccept.AcceptInvitationResponseSchema },
    description:
      "Accept an invitation with its token and join the organization with its role. The invitation must not be expired, must have been sent to the email of the signed-in user, who must not already be a member.",
  },
});

type ActionRoute = typeof route;

@ResourceProvider
export class InvitationsAcceptHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvitationsAcceptHandlers {
    return new this(args);
  }

  override register(): void {
    this.app.openapi(route, this.#defineAccept);
  }

  #defineAccept = async (context: OpenAPIHandlerContext<ActionRoute>) => {
    const {
      var: {
        db: { connection },
        caller,
      },
    } = context;

    if (caller?.type !== "user") {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    const { token } = context.req.valid("json");

    const result = await AcceptInvitationService.create({
      db: connection,
      userId: caller.user.id,
      token,
    }).accept();

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to accept invitation",
        }),
      });
    }

    const build = (): Response200<ActionRoute> => ({ membership: result.result });

    return context.json(build(), 200);
  };
}
