import { InvoiceService, type InvoiceServiceArgs } from "./_invoice";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import {
  type Jobs as JobsType,
  PdfStoragePath,
  type TriggerJobs,
  TriggeredJobKey,
} from "@usenullish/nullish-schema/jobs";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Services } from "@usenullish/nullish-schema/services";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { join } from "node:path";

interface JobContextArgs {
  jobs: TriggerJobs;
}

type JobsInvoiceServiceArgs = InvoiceServiceArgs & JobContextArgs;
type UserId = Records["Auth"]["Users"]["Select"]["id"];

export class JobsInvoiceService extends InvoiceService {
  readonly #jobs: TriggerJobs;
  readonly #userId: UserId;

  private constructor({ jobs, userId, ...rest }: JobsInvoiceServiceArgs) {
    super({ userId, ...rest });

    this.#jobs = jobs;
    this.#userId = userId;
  }

  static create(args: JobsInvoiceServiceArgs): JobsInvoiceService {
    return new this(args);
  }

  generatePdf(
    args: Services["Invoices"]["GeneratePdf"]["Args"],
  ): Promise<Result<JobsType["Common"]["ScheduledJobs"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Ensure the user has privileges to access the invoice
        const invoice = await this._loadInvoice({ tx });

        // 2. Trigger the job
        return await this.#jobs.trigger({
          key: TriggeredJobKey.PdfInvoice,
          payload: {
            invoiceId: invoice.id,
            userId: this.#userId,
            ...args,
          },
        });
      });
    });
  }

  jobState(
    args: Services["Invoices"]["PdfJobState"]["Args"],
  ): Promise<Result<Services["Invoices"]["PdfJobState"]["Result"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Ensure the user has privileges to access the invoice
        // TODO: _withInvoice? or local?
        const invoice = await this._loadInvoice({ tx });

        // 2. Ensure the job is the one of the invoice
        const { invoiceId } = await this.#jobs.getPayload<JobsType["PdfInvoices"]["Payload"]>({
          key: TriggeredJobKey.PdfInvoice,
          ...args,
        });

        if (invoiceId !== invoice.id) {
          throw new Error(`Job ${args.jobId} does not exist`);
        }

        // 3. Retrieve the job state
        return await this.#jobs.getState({
          key: TriggeredJobKey.PdfInvoice,
          ...args,
        });
      });
    });
  }

  stream(
    args: Services["Invoices"]["PdfStream"]["Args"],
  ): Promise<Result<Services["Invoices"]["PdfStream"]["Result"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Ensure the user has privileges to access the invoice
        // TODO: _withInvoice? or local?
        const invoice = await this._loadInvoice({ tx });

        // 2. Retrieve the document
        const { documentId } = args;

        const storage = FsStorageProvider.create();

        // TODO: create a utils for the key
        return await storage.get({
          key: join(PdfStoragePath.Invoices, invoice.id, `${documentId}.pdf`),
        });
      });
    });
  }
}
