import { JobFactory } from "./_job";
import type { Common } from "@usenullish/nullish-schema/primitives";
import type { JobArgs } from "../_types";
import {
  type Jobs,
  JobsSchema,
  PdfStoragePath,
  TriggeredJobKey,
} from "@usenullish/nullish-schema/jobs";
import { PdfGenerator } from "./workers/pdf-invoices/_helpers/pdf-generator";
import { renderHtmlTemplate } from "@usenullish/nullish-templates";
import { join } from "node:path";
import { PdfInvoicesWorker } from "./workers/pdf-invoices/worker";
import { TriggeredJob } from "./_job.triggered";

const PdfInvoiceJobPayloadSchema = JobsSchema.PdfInvoicesSchema.PdfInvoicePayloadSchema;
const PdfInvoiceJobResultSchema = JobsSchema.PdfInvoicesSchema.PdfInvoiceResultSchema;

@JobFactory
export class PdfInvoiceJob extends TriggeredJob<
  typeof PdfInvoiceJobPayloadSchema,
  typeof PdfInvoiceJobResultSchema
> {
  protected constructor(args: JobArgs) {
    super({
      ...args,
      key: TriggeredJobKey.PdfInvoice,
      payloadSchema: PdfInvoiceJobPayloadSchema,
      resultSchema: PdfInvoiceJobResultSchema,
    });
  }

  static async start({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): Promise<PdfInvoiceJob> {
    return new this({ dbUrl });
  }

  protected override async worker({
    payload: { invoiceId, ...rest },
  }: {
    payload: Jobs["PdfInvoices"]["Payload"];
  }): Promise<Jobs["PdfInvoices"]["Result"]> {
    const { html, data } = await PdfInvoicesWorker.create({
      payload: { invoiceId, ...rest },
    }).prepare();

    const invoiceHtml = await renderHtmlTemplate({ template: html, data });

    const documentId = crypto.randomUUID();

    const generator = await PdfGenerator.create();
    await generator.render({
      html: invoiceHtml,
      output: {
        path: join(PdfStoragePath.Invoices, invoiceId),
        filename: `${documentId}.pdf`,
      },
    });

    return {
      documentId,
    };
  }
}
