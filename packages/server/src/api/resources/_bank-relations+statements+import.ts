import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { ImportStatementsService } from "@usenullish/nullish-engine/banking";
import {
  ApiSchema,
  BANK_STATEMENT_FILE_MAX_SIZE,
  CommonSchema,
  ErrorCode,
} from "@usenullish/nullish-schema/server";
import { bodyLimit } from "hono/body-limit";
import { defineActionWithFormDataRequestBodyRoute } from "./_factories/action-route-config";
import type { OpenAPIFormDataHandlerContext, Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { RATE_LIMITS, userRateLimitMiddleware } from "../middlewares/rate-limit";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const actionRoute = defineActionWithFormDataRequestBodyRoute({
  path: "/banking/relations/{parentId}/statements/import",
  spec: { tag: "Bank relations" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.BankRelationsStatementsImport.ImportStatementsRequestSchema },
  },
  response: {
    body: {
      schema: ApiSchema.BankRelationsStatementsImport.ImportStatementsResponseSchema,
    },
    description: "Bank statements imported",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class BankRelationsStatementsImportHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): BankRelationsStatementsImportHandlers {
    return new this(args);
  }

  override useCustomMiddleware() {
    this.app.use(
      this._toHonoPath(actionRoute.path),
      userRateLimitMiddleware({ limit: RATE_LIMITS.statementsImport }),
    );

    this.app.use(
      this._toHonoPath(actionRoute.path),
      bodyLimit({
        maxSize: BANK_STATEMENT_FILE_MAX_SIZE,
        onError: (context) =>
          errorResponse({
            context,
            error: "The file is too large",
            code: ErrorCode.LIMITED,
            status: 413,
          }),
      }),
    );
  }

  override register(): void {
    this.registerFormDataRoute({ route: actionRoute, handler: this.#defineImport });
  }

  #defineImport = withRest<ActionRoute, OpenAPIFormDataHandlerContext<ActionRoute>>(
    withPermission<ActionRoute, OpenAPIFormDataHandlerContext<ActionRoute>>(
      async ({ context, caller }) => {
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

        const { file } = req.valid("form");

        const result = await ImportStatementsService.create({
          db: connection,
          userId: caller.userId,
          bankRelationId: parentId,
        }).import({ file: await file.bytes() });

        if (result.status === "error") {
          console.error(result.err);
          return errorResponse({
            context,
            ...toApiError({
              err: result.err,
              fallback: "Failed to import bank statements",
            }),
          });
        }

        const build = (): Response200<ActionRoute> => result.result;

        return context.json(build(), 200);
      },
    ),
  );
}
