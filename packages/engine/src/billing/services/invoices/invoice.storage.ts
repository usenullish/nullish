import { InvoiceService, type InvoiceServiceArgs } from "./_invoice";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Services } from "@usenullish/nullish-schema/services";
import { join } from "node:path";
import type { Storage } from "@usenullish/nullish-storage";
import { PdfStoragePath } from "@usenullish/nullish-schema/jobs";

interface StorageContextArgs {
  storage: Storage;
}

type StorageInvoiceServiceArgs = InvoiceServiceArgs & StorageContextArgs;

export class StorageInvoiceService extends InvoiceService {
  readonly #storage: Storage;

  private constructor({ storage, ...rest }: StorageInvoiceServiceArgs) {
    super(rest);

    this.#storage = storage;
  }

  static create(args: StorageInvoiceServiceArgs): StorageInvoiceService {
    return new this(args);
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

        // TODO: create a utils for the key
        return await this.#storage.get({
          key: join(PdfStoragePath.Invoices, invoice.id, `${documentId}.pdf`),
        });
      });
    });
  }
}
