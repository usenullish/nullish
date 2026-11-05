import { Storage, StorageProvider } from "../provider";
import { dirname, join } from "node:path";
import { envDataDir } from "@usenullish/nullish-env";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { StorageSchema, type Storage as StorageTypes } from "@usenullish/nullish-schema/storage";

@StorageProvider
export class FsStorageProvider extends Storage {
  private constructor() {
    super();
  }

  static create(): FsStorageProvider {
    return new this();
  }

  override async put(args: StorageTypes["Put"]["Args"]): Promise<void> {
    const { key, body } = StorageSchema.StoragePutArgsSchema.parse(args);

    const filePath = join(envDataDir(), key);

    await mkdir(dirname(filePath), { recursive: true });

    if (body instanceof ReadableStream) {
      const writer = Bun.file(filePath).writer();

      for await (const chunk of body) {
        writer.write(chunk);
      }

      await writer.end();

      return;
    }

    await Bun.write(filePath, body);
  }

  override async get(args: StorageTypes["Get"]["Args"]): Promise<StorageTypes["Get"]["Result"]> {
    const { key } = StorageSchema.StorageGetArgsSchema.parse(args);

    const filePath = join(envDataDir(), key);

    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      throw new Error(`Storage file not found for key: ${key}`);
    }

    return StorageSchema.StorageGetResultSchema.parse({
      stream: file.stream(),
      contentType: file.type,
    });
  }

  override async delete(args: StorageTypes["Delete"]["Args"]): Promise<void> {
    const { path, modifiedBefore } = StorageSchema.StorageDeleteArgsSchema.parse(args);

    const dirPath = join(envDataDir(), path);

    if (!existsSync(dirPath)) {
      return;
    }

    const entries = await readdir(dirPath, { recursive: true, withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filePath = join(entry.parentPath, entry.name);
          const { mtime } = await stat(filePath);

          return { filePath, mtime };
        }),
    );

    // Only files are deleted, the folders are kept even once empty. Removing a folder could race with
    // a put writing a new file into it: put creates the folder, then writes the file, which would fail
    // if the folder was removed in between.
    await Promise.all(
      files
        .filter(({ mtime }) => mtime < modifiedBefore)
        .map(({ filePath }) => rm(filePath, { force: true })),
    );
  }
}
