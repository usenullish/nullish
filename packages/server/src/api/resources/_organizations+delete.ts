import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { DeleteOrganizationService } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  encodeOrganizationResponse,
} from "@usenullish/nullish-schema/server";
import { defineActionWithoutRequestBodyRoute } from "./_factories/action-route-config";
import type { OpenAPIHandlerContext, Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";

const actionRoute = defineActionWithoutRequestBodyRoute({
  path: "/organizations/{parentId}/delete",
  spec: { tag: "Organizations" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.OrganizationsDelete.DeleteOrganizationResponseSchema },
    description:
      "Mark an organization as deleted. It stays readable by its members but can no longer be modified, and it is deleted with all its records after a grace period of 30 days. Only admins mark an organization as deleted.",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class OrganizationsDeleteHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsDeleteHandlers {
    return new this(args);
  }

  override register(): void {
    this.app.openapi(actionRoute, this.#defineDelete);
  }

  #defineDelete = async (context: OpenAPIHandlerContext<ActionRoute>) => {
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

    const parentId = context.req.param("parentId");

    if (isInvalidUuid(parentId)) {
      return errorResponse({
        context,
        error: "Bad Request",
        code: ErrorCode.VALIDATION,
        status: 400,
      });
    }

    const result = await DeleteOrganizationService.create({
      db: connection,
      userId: caller.userId,
      organizationId: parentId,
    }).delete();

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to delete organization",
        }),
      });
    }

    const build = (): Response200<ActionRoute> => ({
      organization: encodeOrganizationResponse(result.result),
    });

    return context.json(build(), 200);
  };
}
