import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { defineActionWithoutRequestBodyRoute } from "./_factories/action-route-config";
import type { Response200 } from "../types/openapi";
import { JobsMigrationService } from "@usenullish/nullish-engine/migration";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";
import { RATE_LIMITS, userRateLimitMiddleware } from "../middlewares/rate-limit";

const actionRoute = defineActionWithoutRequestBodyRoute({
  path: "/migrations/{parentId}/run",
  spec: { tag: "Migrations" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.MigrationsRun.RunMigrationResponseSchema },
    description: "Migration queued to run",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class MigrationsRunHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): MigrationsRunHandlers {
    return new this(args);
  }

  override useCustomMiddleware() {
    this.app.use(
      this._toHonoPath(actionRoute.path),
      userRateLimitMiddleware({ limit: RATE_LIMITS.migrationsRun }),
    );
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#defineRun });
  }

  #defineRun = withRest<ActionRoute>(
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

      const result = await JobsMigrationService.create({
        db: connection,
        jobs,
        userId: caller.userId,
        migrationId: parentId,
      }).start();

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to run the migration",
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
