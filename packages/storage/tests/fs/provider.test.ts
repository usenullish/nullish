import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FsStorageProvider } from "../../src/fs/provider";

describe("FsStorageProvider", () => {
  let dataDir: string;
  let originalDataDir: string | undefined;
  let provider: FsStorageProvider;

  beforeEach(async () => {
    originalDataDir = process.env.NULLISH_DATA_DIR;
    dataDir = await mkdtemp(join(tmpdir(), "nullish-storage-"));
    process.env.NULLISH_DATA_DIR = dataDir;
    provider = FsStorageProvider.create();
  });

  afterEach(async () => {
    if (originalDataDir === undefined) {
      delete process.env.NULLISH_DATA_DIR;
    } else {
      process.env.NULLISH_DATA_DIR = originalDataDir;
    }
    await rm(dataDir, { recursive: true, force: true });
  });

  describe("put", () => {
    test("writes a Uint8Array body to the key path", async () => {
      await provider.put({ key: "invoices/1.pdf", body: new TextEncoder().encode("hello") });

      expect(await readFile(join(dataDir, "invoices/1.pdf"), "utf-8")).toBe("hello");
    });

    test("writes a Blob body to the key path", async () => {
      await provider.put({ key: "a.txt", body: new Blob(["blob content"]) });

      expect(await readFile(join(dataDir, "a.txt"), "utf-8")).toBe("blob content");
    });

    test("writes a ReadableStream body to the key path", async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("stream "));
          controller.enqueue(new TextEncoder().encode("content"));
          controller.close();
        },
      });

      await provider.put({ key: "b.txt", body: stream });

      expect(await readFile(join(dataDir, "b.txt"), "utf-8")).toBe("stream content");
    });

    test("creates nested directories for the key", async () => {
      await provider.put({ key: "nested/dir/file.bin", body: new Uint8Array([1, 2, 3]) });

      expect([...(await readFile(join(dataDir, "nested/dir/file.bin")))]).toEqual([1, 2, 3]);
    });

    test("overwrites an existing file at the same key", async () => {
      await provider.put({ key: "a.txt", body: new TextEncoder().encode("first") });
      await provider.put({ key: "a.txt", body: new TextEncoder().encode("second") });

      expect(await readFile(join(dataDir, "a.txt"), "utf-8")).toBe("second");
    });

    test("throws when the key is empty", async () => {
      expect(provider.put({ key: "", body: new Uint8Array() })).rejects.toThrow();
    });

    test("throws when the body does not match the schema", async () => {
      expect(provider.put({ key: "a.txt", body: "not-a-valid-body" } as never)).rejects.toThrow();
    });
  });

  describe("get", () => {
    test("returns the file content as a stream when the key exists", async () => {
      await provider.put({ key: "existing.txt", body: new TextEncoder().encode("payload") });

      const result = await provider.get({ key: "existing.txt" });

      const chunks: Uint8Array[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      expect(Buffer.concat(chunks).toString("utf-8")).toBe("payload");
    });

    test("returns the file content type", async () => {
      await provider.put({ key: "existing.txt", body: new TextEncoder().encode("payload") });

      const result = await provider.get({ key: "existing.txt" });

      expect(result.contentType).toContain("text/plain");
    });

    test("throws when the file does not exist", async () => {
      expect(provider.get({ key: "missing.txt" })).rejects.toThrow(
        "Storage file not found for key: missing.txt",
      );
    });

    test("throws when the key is empty", async () => {
      expect(provider.get({ key: "" })).rejects.toThrow();
    });
  });

  describe("delete", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const putWithMtime = async ({ key, mtime }: { key: string; mtime: Date }) => {
      await provider.put({ key, body: new TextEncoder().encode(key) });
      await utimes(join(dataDir, key), mtime, mtime);
    };

    test("deletes the files under the path modified before the date", async () => {
      await putWithMtime({ key: "invoices/1/old.pdf", mtime: lastWeek });

      await provider.delete({ path: "invoices", modifiedBefore: yesterday });

      expect(existsSync(join(dataDir, "invoices/1/old.pdf"))).toBeFalse();
    });

    test("keeps the files under the path modified after the date", async () => {
      await provider.put({
        key: "invoices/1/recent.pdf",
        body: new TextEncoder().encode("recent"),
      });

      await provider.delete({ path: "invoices", modifiedBefore: yesterday });

      expect(existsSync(join(dataDir, "invoices/1/recent.pdf"))).toBeTrue();
    });

    test("deletes only the old files when old and recent files share a folder", async () => {
      await putWithMtime({ key: "invoices/1/old.pdf", mtime: lastWeek });
      await provider.put({
        key: "invoices/1/recent.pdf",
        body: new TextEncoder().encode("recent"),
      });

      await provider.delete({ path: "invoices", modifiedBefore: yesterday });

      expect(existsSync(join(dataDir, "invoices/1/old.pdf"))).toBeFalse();
      expect(existsSync(join(dataDir, "invoices/1/recent.pdf"))).toBeTrue();
    });

    test("keeps old files outside the path", async () => {
      await putWithMtime({ key: "other/old.pdf", mtime: lastWeek });

      await provider.delete({ path: "invoices", modifiedBefore: yesterday });

      expect(existsSync(join(dataDir, "other/old.pdf"))).toBeTrue();
    });

    test("does nothing when the path does not exist", async () => {
      expect(
        provider.delete({ path: "missing", modifiedBefore: yesterday }),
      ).resolves.toBeUndefined();
    });

    test("throws when the path is empty", async () => {
      expect(provider.delete({ path: "", modifiedBefore: yesterday })).rejects.toThrow();
    });
  });
});
