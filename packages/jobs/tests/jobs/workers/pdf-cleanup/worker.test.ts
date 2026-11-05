import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { envDataDir } from "@usenullish/nullish-env";
import { PdfStoragePath } from "@usenullish/nullish-schema/jobs";
import { PdfCleanupWorker } from "../../../../src/jobs/workers/pdf-cleanup/worker";

const HOUR_MS = 60 * 60 * 1000;

describe("PdfCleanupWorker", () => {
  let dirs: string[] = [];

  const createDir = async ({ path }: { path: string }): Promise<string> => {
    const dir = join(envDataDir(), path, crypto.randomUUID());
    await mkdir(dir, { recursive: true });
    dirs = [...dirs, dir];
    return dir;
  };

  const writePdf = async ({
    dir,
    name,
    mtime,
  }: {
    dir: string;
    name: string;
    mtime: Date;
  }): Promise<string> => {
    const filePath = join(dir, name);
    await writeFile(filePath, "pdf");
    await utimes(filePath, mtime, mtime);
    return filePath;
  };

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs = [];
  });

  test("returns a success result", async () => {
    const result = await PdfCleanupWorker.create().run();

    expect(result.status).toBe("success");
  });

  test("deletes the invoice PDFs older than two hours", async () => {
    const dir = await createDir({ path: PdfStoragePath.Invoices });
    const old = await writePdf({ dir, name: "old.pdf", mtime: new Date(Date.now() - 3 * HOUR_MS) });

    await PdfCleanupWorker.create().run();

    expect(existsSync(old)).toBeFalse();
  });

  test("keeps the invoice PDFs from the last two hours", async () => {
    const dir = await createDir({ path: PdfStoragePath.Invoices });
    const recent = await writePdf({
      dir,
      name: "recent.pdf",
      mtime: new Date(Date.now() - HOUR_MS),
    });

    await PdfCleanupWorker.create().run();

    expect(existsSync(recent)).toBeTrue();
  });

  test("deletes only the old PDFs when old and recent PDFs share a folder", async () => {
    const dir = await createDir({ path: PdfStoragePath.Invoices });
    const old = await writePdf({ dir, name: "old.pdf", mtime: new Date(Date.now() - 3 * HOUR_MS) });
    const recent = await writePdf({ dir, name: "recent.pdf", mtime: new Date() });

    await PdfCleanupWorker.create().run();

    expect(existsSync(old)).toBeFalse();
    expect(existsSync(recent)).toBeTrue();
  });

  test("keeps old files outside the PDF storage paths", async () => {
    const dir = await createDir({ path: "other" });
    const old = await writePdf({ dir, name: "old.pdf", mtime: new Date(Date.now() - 3 * HOUR_MS) });

    await PdfCleanupWorker.create().run();

    expect(existsSync(old)).toBeTrue();
  });
});
