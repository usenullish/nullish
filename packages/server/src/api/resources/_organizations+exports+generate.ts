import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { defineActionWithoutRequestBodyRoute } from "./_factories/action-route-config";
import type { Response200 } from "../types/openapi";
import { JobsExportService } from "@usenullish/nullish-engine/core";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";
import { RATE_LIMITS, userRateLimitMiddleware } from "../middlewares/rate-limit";

const actionRoute = defineActionWithoutRequestBodyRoute({
  path: "/organizations/{parentId}/exports/generate",
  spec: { tag: "Organizations" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.Exports.GenerateExportResponseSchema },
    description: "Export of the organization queued",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class OrganizationsExportsGenerateHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsExportsGenerateHandlers {
    return new this(args);
  }

  override useCustomMiddleware() {
    this.app.use(
      this._toHonoPath(actionRoute.path),
      userRateLimitMiddleware({ limit: RATE_LIMITS.exportsGenerate }),
    );
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#defineGenerate });
  }

  #defineGenerate = withRest<ActionRoute>(
    withPermission<ActionRoute>(async ({ context, caller }) => {
      const {
        var: {
          db: { connection },
          workers: { jobs },
        },
      } = context;

      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const result = await JobsExportService.create({
        db: connection,
        jobs,
        userId: caller.userId,
        organizationId: parentId,
      }).generate();

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to export the organization",
          }),
        });
      }

      const build = (): Response200<ActionRoute> => {
        return { status: "queued", ...result.result };
      };

      return context.json(build(), 200);
    }),
  );
}
