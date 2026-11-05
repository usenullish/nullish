import { type Result, tryCatch } from "@usenullish/nullish-common";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { PdfStoragePath } from "@usenullish/nullish-schema/jobs";

// A PDF can only be downloaded while the result of its job, which holds the document id, is kept (one hour).
const PDF_RETENTION_MS = 2 * 60 * 60 * 1000;

export class PdfCleanupWorker {
  private constructor() {}

  static create(): PdfCleanupWorker {
    return new this();
  }

  run(): Promise<Result<void>> {
    return tryCatch(async () => {
      const storage = FsStorageProvider.create();

      const modifiedBefore = new Date(Date.now() - PDF_RETENTION_MS);

      await Promise.all(
        Object.values(PdfStoragePath).map((path) => storage.delete({ path, modifiedBefore })),
      );
    });
  }
}
