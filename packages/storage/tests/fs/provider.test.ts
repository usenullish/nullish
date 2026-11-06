import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile, rm, utimes } from "node:fs/promises";
import { join } from "node:path";
import { envDataDir } from "@usenullish/nullish-env";
import { FsStorageProvider } from "../../src/fs/provider";

describe("FsStorageProvider", () => {
  let root: string;
  let provider: FsStorageProvider;

  const key = (path: string): string => join(root, path);
  const file = (path: string): string => join(envDataDir(), root, path);

  beforeEach(() => {
    root = join("tests", "storage", crypto.randomUUID());
    provider = FsStorageProvider.create();
  });

  afterEach(async () => {
    await rm(join(envDataDir(), root), { recursive: true, force: true });
  });

  describe("put", () => {
    test("writes a Uint8Array body to the key path", async () => {
      await provider.put({ key: key("invoices/1.pdf"), body: new TextEncoder().encode("hello") });

      expect(await readFile(file("invoices/1.pdf"), "utf-8")).toBe("hello");
    });

    test("writes a Blob body to the key path", async () => {
      await provider.put({ key: key("a.txt"), body: new Blob(["blob content"]) });

      expect(await readFile(file("a.txt"), "utf-8")).toBe("blob content");
    });

    test("writes a ReadableStream body to the key path", async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("stream "));
          controller.enqueue(new TextEncoder().encode("content"));
          controller.close();
        },
      });

      await provider.put({ key: key("b.txt"), body: stream });

      expect(await readFile(file("b.txt"), "utf-8")).toBe("stream content");
    });

    test("creates nested directories for the key", async () => {
      await provider.put({ key: key("nested/dir/file.bin"), body: new Uint8Array([1, 2, 3]) });

      expect([...(await readFile(file("nested/dir/file.bin")))]).toEqual([1, 2, 3]);
    });

    test("overwrites an existing file at the same key", async () => {
      await provider.put({ key: key("a.txt"), body: new TextEncoder().encode("first") });
      await provider.put({ key: key("a.txt"), body: new TextEncoder().encode("second") });

      expect(await readFile(file("a.txt"), "utf-8")).toBe("second");
    });

    test("throws when the key is empty", async () => {
      expect(provider.put({ key: "", body: new Uint8Array() })).rejects.toThrow();
    });

    test("throws when the body does not match the schema", async () => {
      expect(
        provider.put({ key: key("a.txt"), body: "not-a-valid-body" } as never),
      ).rejects.toThrow();
    });
  });

  describe("get", () => {
    test("returns the file content as a stream when the key exists", async () => {
      await provider.put({ key: key("existing.txt"), body: new TextEncoder().encode("payload") });

      const result = await provider.get({ key: key("existing.txt") });

      const chunks: Uint8Array[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      expect(Buffer.concat(chunks).toString("utf-8")).toBe("payload");
    });

    test("returns the file content type", async () => {
      await provider.put({ key: key("existing.txt"), body: new TextEncoder().encode("payload") });

      const result = await provider.get({ key: key("existing.txt") });

      expect(result.contentType).toContain("text/plain");
    });

    test("throws when the file does not exist", async () => {
      expect(provider.get({ key: key("missing.txt") })).rejects.toThrow(
        `Storage file not found for key: ${key("missing.txt")}`,
      );
    });

    test("throws when the key is empty", async () => {
      expect(provider.get({ key: "" })).rejects.toThrow();
    });
  });

  describe("delete", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const putWithMtime = async ({ path, mtime }: { path: string; mtime: Date }) => {
      await provider.put({ key: key(path), body: new TextEncoder().encode(path) });
      await utimes(file(path), mtime, mtime);
    };

    test("deletes the files under the path modified before the date", async () => {
      await putWithMtime({ path: "invoices/1/old.pdf", mtime: lastWeek });

      await provider.delete({ path: key("invoices"), modifiedBefore: yesterday });

      expect(existsSync(file("invoices/1/old.pdf"))).toBeFalse();
    });

    test("keeps the files under the path modified after the date", async () => {
      await provider.put({
        key: key("invoices/1/recent.pdf"),
        body: new TextEncoder().encode("recent"),
      });

      await provider.delete({ path: key("invoices"), modifiedBefore: yesterday });

      expect(existsSync(file("invoices/1/recent.pdf"))).toBeTrue();
    });

    test("deletes only the old files when old and recent files share a folder", async () => {
      await putWithMtime({ path: "invoices/1/old.pdf", mtime: lastWeek });
      await provider.put({
        key: key("invoices/1/recent.pdf"),
        body: new TextEncoder().encode("recent"),
      });

      await provider.delete({ path: key("invoices"), modifiedBefore: yesterday });

      expect(existsSync(file("invoices/1/old.pdf"))).toBeFalse();
      expect(existsSync(file("invoices/1/recent.pdf"))).toBeTrue();
    });

    test("keeps old files outside the path", async () => {
      await putWithMtime({ path: "other/old.pdf", mtime: lastWeek });

      await provider.delete({ path: key("invoices"), modifiedBefore: yesterday });

      expect(existsSync(file("other/old.pdf"))).toBeTrue();
    });

    test("does nothing when the path does not exist", async () => {
      expect(
        provider.delete({ path: key("missing"), modifiedBefore: yesterday }),
      ).resolves.toBeUndefined();
    });

    test("throws when the path is empty", async () => {
      expect(provider.delete({ path: "", modifiedBefore: yesterday })).rejects.toThrow();
    });
  });
});
