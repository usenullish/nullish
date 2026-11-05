import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { IgnoreMovementService } from "@usenullish/nullish-engine/banking";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  encodeBankMovementResponse,
} from "@usenullish/nullish-schema/server";
import { defineActionWithoutRequestBodyRoute } from "./_factories/action-route-config";
import type { Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const actionRoute = defineActionWithoutRequestBodyRoute({
  path: "/banking/movements/{parentId}/ignore",
  spec: { tag: "Bank movements" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.BankMovementsIgnore.IgnoreBankMovementResponseSchema },
    description: "Bank movement set to ignored, which cannot be undone",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class BankMovementsIgnoreHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): BankMovementsIgnoreHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#defineIgnore });
  }

  #defineIgnore = withRest<ActionRoute>(
    withPermission<ActionRoute>(async ({ context, caller }) => {
      const {
        var: {
          db: { connection },
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

      const result = await IgnoreMovementService.create({
        db: connection,
        userId: caller.userId,
        movementId: parentId,
      }).ignore();

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to ignore bank movement",
          }),
        });
      }

      const build = (): Response200<ActionRoute> => {
        return { bankMovement: encodeBankMovementResponse(result.result) };
      };

      return context.json(build(), 200);
    }),
  );
}
