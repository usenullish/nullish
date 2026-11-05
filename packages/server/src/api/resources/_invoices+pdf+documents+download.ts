import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { StorageInvoiceService } from "@usenullish/nullish-engine/billing";
import { defineDownloadRoute } from "./_factories/download-route-config";
import { errorResponse } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const route = {
  path: "/billing/invoices/{parentId}/pdf/documents/{id}/download",
  spec: { tag: "Invoices" },
} as const;

const getDownloadRoute = defineDownloadRoute({
  ...route,
  request: {
    params: {
      schema: CommonSchema.Params.ChildRouteIdParamsSchema,
    },
  },
  response: {
    description: "Download the generated PDF invoice file",
    contentType: "application/pdf",
  },
});

type GetDownloadRoute = typeof getDownloadRoute;

@ResourceProvider
export class InvoicesPdfDocumentsDownloadHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoicesPdfDocumentsDownloadHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: getDownloadRoute, handler: this.#downloadPdf });
  }

  #downloadPdf = withRest<GetDownloadRoute>(
    withPermission<GetDownloadRoute>(async ({ context, caller }) => {
      const {
        req,
        var: {
          db: { connection },
          workers: { storage },
        },
      } = context;

      const parentId = req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const id = req.param("id");

      if (isInvalidUuid(id)) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const result = await StorageInvoiceService.create({
        db: connection,
        storage,
        userId: caller.userId,
        invoiceId: parentId,
      }).stream({ documentId: id });

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          error: "Document not found",
          code: ErrorCode.NOT_FOUND,
          status: 404,
        });
      }

      const { stream, contentType } = result.result;

      context.header("Content-Type", contentType ?? "application/pdf");
      context.header("Content-Disposition", `inline; filename="invoice-${parentId}.pdf"`);

      return context.body(stream, 200);
    }),
  );
}
