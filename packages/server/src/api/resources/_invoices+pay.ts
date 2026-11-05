import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { PayInvoiceService } from "@usenullish/nullish-engine/billing";
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
  path: "/billing/invoices/{parentId}/pay",
  spec: { tag: "Invoices" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.InvoicesPay.PayInvoiceRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.InvoicesPay.PayInvoiceResponseSchema },
    description: "Invoice set to paid",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class InvoicesPayHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoicesPayHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#definePay });
  }

  #definePay = withRest<ActionRoute>(
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

      const result = await PayInvoiceService.create({
        db: connection,
        userId: caller.userId,
        invoiceId: parentId,
      }).pay(values);

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to pay invoice",
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
