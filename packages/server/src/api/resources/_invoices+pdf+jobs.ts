import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { ApiSchema, CommonSchema } from "@usenullish/nullish-schema/server";
import { JobsInvoiceService } from "@usenullish/nullish-engine/billing";
import { defineGetByIdRoute } from "./_factories/crud-route-config";
import { defineJobStateHandler } from "../handlers/jobs/state";

const route = {
  path: "/billing/invoices/{parentId}/pdf/jobs",
  spec: { tag: "Invoices" },
} as const;

const getByIdRoute = defineGetByIdRoute({
  ...route,
  request: {
    params: {
      schema: CommonSchema.Params.ChildRouteIdParamsSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.InvoicesPdf.PdfInvoiceJobStateResponseSchema,
    },
    description: "PDF generation job status",
  },
});

type GetByIdRoute = typeof getByIdRoute;

@ResourceProvider
export class InvoicesPdfJobsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): InvoicesPdfJobsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: getByIdRoute, handler: this.#getJobStatus });
  }

  readonly #getJobStatus = defineJobStateHandler<GetByIdRoute>({
    jobState: ({ db, userId, jobs, parentId, jobId }) =>
      JobsInvoiceService.create({ db, jobs, userId, invoiceId: parentId }).jobState({ jobId }),
    resourceKey: "PDF job",
  });
}
