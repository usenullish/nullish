import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { defineActionWithRequestBodyRoute } from "./_factories/action-route-config";
import type { Response200 } from "../types/openapi";
import { JobsInvoiceService } from "@usenullish/nullish-engine/billing";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";
import { RATE_LIMITS, userRateLimitMiddleware } from "../middlewares/rate-limit";

const actionRoute = defineActionWithRequestBodyRoute({
  path: "/billing/invoices/{parentId}/pdf/generate",
  spec: { tag: "Invoices" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.InvoicesPdf.GeneratePdfInvoiceRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.InvoicesPdf.PdfInvoiceResponseSchema },
    description: "PDF generation queued for the invoice",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class InvoicesPdfGenerateHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoicesPdfGenerateHandlers {
    return new this(args);
  }

  override useCustomMiddleware() {
    this.app.use(
      this._toHonoPath(actionRoute.path),
      userRateLimitMiddleware({ limit: RATE_LIMITS.pdfGenerate }),
    );
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#definePdfGenerate });
  }

  #definePdfGenerate = withRest<ActionRoute>(
    withPermission<ActionRoute>(async ({ context, caller }) => {
      const {
        req,
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

      const values = req.valid("json");

      const result = await JobsInvoiceService.create({
        db: connection,
        jobs,
        userId: caller.userId,
        invoiceId: parentId,
      }).generatePdf(values);

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to generate PDF for invoice",
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
