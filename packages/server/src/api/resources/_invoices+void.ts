import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { VoidInvoiceService } from "@usenullish/nullish-engine/billing";
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
  path: "/billing/invoices/{parentId}/void",
  spec: { tag: "Invoices" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: {
      schema: ApiSchema.InvoicesVoid.VoidInvoiceRequestSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.InvoicesVoid.VoidInvoiceResponseSchema },
    description: "Invoice set to void",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class InvoicesVoidHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoicesVoidHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#defineVoid });
  }

  #defineVoid = withRest<ActionRoute>(
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

      const result = await VoidInvoiceService.create({
        db: connection,
        userId: caller.userId,
        invoiceId: parentId,
      }).void(values);

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to void invoice",
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
