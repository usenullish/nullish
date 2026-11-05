import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { DateCodec, isInvalidUuid, encodeWithCodecs } from "@usenullish/nullish-common";
import { ClosePeriodService } from "@usenullish/nullish-engine/ledger";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import { defineActionWithRequestBodyRoute } from "./_factories/action-route-config";
import type { Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const actionRoute = defineActionWithRequestBodyRoute({
  path: "/accounting/periods/{parentId}/close",
  spec: { tag: "Periods" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: {
      schema: ApiSchema.PeriodsClose.ClosePeriodRequestSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.PeriodsClose.ClosePeriodResponseSchema,
    },
    description: "Period closed",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class PeriodsCloseHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): PeriodsCloseHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#defineClose });
  }

  #defineClose = withRest<ActionRoute>(
    withPermission<ActionRoute>(async ({ context, caller }) => {
      const {
        req,
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

      const { mode } = req.valid("json");

      const result = await ClosePeriodService.create({
        db: connection,
        userId: caller.userId,
        periodId: parentId,
      }).close({ mode });

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to close period",
          }),
        });
      }

      const { result: period } = result;

      const build = (): Response200<ActionRoute> => {
        return {
          period: {
            ...encodeAuditFieldsResponse(period),
            startOn: encodeWithCodecs({ schema: DateCodec, value: period.startOn }),
            endOn: encodeWithCodecs({ schema: DateCodec, value: period.endOn }),
          },
        };
      };

      return context.json(build(), 200);
    }),
  );
}
