import { ExportService, type ExportServiceArgs } from "./_export";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Services } from "@usenullish/nullish-schema/services";
import { join } from "node:path";
import type { Storage } from "@usenullish/nullish-storage";
import { StoragePath } from "@usenullish/nullish-schema/jobs";

interface StorageContextArgs {
  storage: Storage;
}

type StorageExportServiceArgs = ExportServiceArgs & StorageContextArgs;

export class StorageExportService extends ExportService {
  readonly #storage: Storage;

  private constructor({ storage, ...rest }: StorageExportServiceArgs) {
    super(rest);

    this.#storage = storage;
  }

  static create(args: StorageExportServiceArgs): StorageExportService {
    return new this(args);
  }

  stream(
    args: Services["Exports"]["Stream"]["Args"],
  ): Promise<Result<Services["Exports"]["Stream"]["Result"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Ensure the user has privileges to access the organization
        const organization = await this._loadOrganization({ tx });

        // 2. Retrieve the archive
        const { exportId } = args;

        // TODO: create a utils for the key
        return await this.#storage.get({
          key: join(StoragePath.Organizations, organization.id, `${exportId}.tar.gz`),
        });
      });
    });
  }
}
