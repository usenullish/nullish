import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { UncollectibleInvoiceService } from "@usenullish/nullish-engine/billing";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  encodeInvoiceResponse,
} from "@usenullish/nullish-schema/server";
import { defineActionWithRequestBodyRoute } from "./_factories/action-route-config";
import type { Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const actionRoute = defineActionWithRequestBodyRoute({
  path: "/billing/invoices/{parentId}/uncollectible",
  spec: { tag: "Invoices" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: {
      schema: ApiSchema.InvoicesUncollectible.UncollectibleInvoiceRequestSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.InvoicesUncollectible.UncollectibleInvoiceResponseSchema,
    },
    description: "Invoice set to uncollectible",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class InvoicesUncollectibleHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoicesUncollectibleHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#defineUncollectible });
  }

  #defineUncollectible = withRest<ActionRoute>(
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

      const values = req.valid("json");

      const result = await UncollectibleInvoiceService.create({
        db: connection,
        userId: caller.userId,
        invoiceId: parentId,
      }).writeOff(values);

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to write-off invoice",
          }),
        });
      }

      const build = (): Response200<ActionRoute> => {
        return { invoice: encodeInvoiceResponse(result.result) };
      };

      return context.json(build(), 200);
    }),
  );
}
