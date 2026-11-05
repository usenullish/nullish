import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { PreviewInvitationService } from "@usenullish/nullish-engine/core";
import { defineActionWithRequestBodyRoute } from "./_factories/action-route-config";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { OpenAPIHandlerContext, Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";

const route = defineActionWithRequestBodyRoute({
  spec: { tag: "Invitations" },
  path: "/invitations/preview",
  request: {
    body: { schema: ApiSchema.Invitations.InvitationTokenRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.InvitationsPreview.PreviewInvitationResponseSchema },
    description:
      "Preview the invitation of a token before accepting or declining it: the name of the organization. The invitation must not be expired, must have been sent to the email of the signed-in user, who must not already be a member.",
  },
});

type ActionRoute = typeof route;

@ResourceProvider
export class InvitationsPreviewHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvitationsPreviewHandlers {
    return new this(args);
  }

  override register(): void {
    this.app.openapi(route, this.#definePreview);
  }

  #definePreview = async (context: OpenAPIHandlerContext<ActionRoute>) => {
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

    const result = await PreviewInvitationService.create({
      db: connection,
      userId: caller.user.id,
      token,
    }).preview();

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to preview invitation",
        }),
      });
    }

    const build = (): Response200<ActionRoute> => result.result;

    return context.json(build(), 200);
  };
}
