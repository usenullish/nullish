import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { OpenInvoiceService } from "@usenullish/nullish-engine/billing";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  encodeInvoiceResponse,
} from "@usenullish/nullish-schema/server";
import { defineActionWithoutRequestBodyRoute } from "./_factories/action-route-config";
import type { Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const actionRoute = defineActionWithoutRequestBodyRoute({
  path: "/billing/invoices/{parentId}/open",
  spec: { tag: "Invoices" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.InvoicesOpen.OpenInvoiceResponseSchema,
    },
    description: "Invoice set to open",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class InvoicesOpenHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoicesOpenHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#defineOpen });
  }

  #defineOpen = withRest<ActionRoute>(
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

      const result = await OpenInvoiceService.create({
        db: connection,
        userId: caller.userId,
        invoiceId: parentId,
      }).open();

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to open invoice",
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
