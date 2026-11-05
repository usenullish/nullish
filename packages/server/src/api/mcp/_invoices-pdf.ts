import { JobsInvoiceService } from "@usenullish/nullish-engine/billing";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { ApiSchema, CommonSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { WRITE_TOOL, READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

type InvoicesPdfArgs = DbStoreInitArgs & { jobs: TriggerJobs };

export class McpToolsInvoicesPdf extends McpTools<InvoicesPdfArgs> {
  private constructor(args: McpToolsInitArgs<InvoicesPdfArgs>) {
    super(args);
  }

  static create(args: McpToolsInitArgs<InvoicesPdfArgs>): McpToolsInvoicesPdf {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerGetInvoicePdfJob();
  }

  override registerWriteTools() {
    this.#registerGenerateInvoicePdf();
  }

  #registerGenerateInvoicePdf() {
    this.registerTool({
      title: "generate_invoice_pdf",
      annotations: WRITE_TOOL,
      description:
        "Queues the generation of the PDF document of an invoice. Returns a job whose state can be followed with get_invoice_pdf_job.",
      inputSchema: z.strictObject({
        invoiceId: ApiSchema.Invoices.InvoiceSchema.shape.id,
        values: ApiSchema.InvoicesPdf.GeneratePdfInvoiceRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.InvoicesPdf.PdfInvoiceResponseSchema),
      fn: async ({ invoiceId, values }) => {
        const result = await JobsInvoiceService.create({ ...this._args, invoiceId }).generatePdf(
          values,
        );

        return this.mapResult(result, (job) => ({ status: "queued" as const, ...job }));
      },
    });
  }

  #registerGetInvoicePdfJob() {
    this.registerTool({
      title: "get_invoice_pdf_job",
      annotations: READ_ONLY_TOOL,
      description: "Returns the state of a PDF generation job of an invoice.",
      inputSchema: z.strictObject({
        invoiceId: ApiSchema.Invoices.InvoiceSchema.shape.id,
        jobId: CommonSchema.Params.RouteIdParamsSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.InvoicesPdf.PdfInvoiceJobStateResponseSchema),
      fn: async ({ invoiceId, jobId }) => {
        return await JobsInvoiceService.create({ ...this._args, invoiceId }).jobState({ jobId });
      },
    });
  }
}
