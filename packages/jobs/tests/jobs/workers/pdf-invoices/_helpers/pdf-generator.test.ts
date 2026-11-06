import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { envDataDir } from "@usenullish/nullish-env";
import { PdfGenerator } from "../../../../../src/jobs/workers/pdf-invoices/_helpers/pdf-generator";

const outputPaths: string[] = [];

const renderToFile = async (
  generator: PdfGenerator,
  html: string,
  name: string,
  path = "",
): Promise<`${string}.pdf`> => {
  const filename = `test-pdf-generator-${name}-${crypto.randomUUID()}.pdf` as `${string}.pdf`;

  await generator.render({ html, output: { path, filename } });
  outputPaths.push(join(path, filename));

  return filename;
};

describe("PdfGenerator", () => {
  afterAll(async () => {
    await PdfGenerator.close();
    await Promise.all(
      outputPaths.map((outputPath) => rm(join(envDataDir(), outputPath), { force: true })),
    );
  });

  describe("create", () => {
    test("returns the same instance on repeated calls", async () => {
      const first = await PdfGenerator.create();
      const second = await PdfGenerator.create();

      expect(first).toBe(second);
    });
  });

  describe("render", () => {
    test("writes a valid PDF file to the data dir", async () => {
      const generator = await PdfGenerator.create();
      const outputFilename = await renderToFile(
        generator,
        "<html><body><h1>Hello</h1></body></html>",
        "basic",
      );

      const file = Bun.file(join(envDataDir(), outputFilename));
      const bytes = await file.bytes();

      expect(bytes.byteLength).toBeGreaterThan(0);
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    }, 15000);

    test("creates the output directory when it does not exist yet", async () => {
      const generator = await PdfGenerator.create();
      const filename = await renderToFile(
        generator,
        "<html><body>Nested</body></html>",
        "nested",
        "nested",
      );

      expect(await Bun.file(join(envDataDir(), "nested", filename)).exists()).toBeTrue();
    }, 15000);

    test("completes without hanging on blocked external requests", async () => {
      const generator = await PdfGenerator.create();
      const html = `<html><body>
        <img src="https://example.invalid/image.png" />
        <link rel="stylesheet" href="https://example.invalid/style.css" />
        External
      </body></html>`;

      const outputFilename = await renderToFile(generator, html, "external-request");

      expect(await Bun.file(join(envDataDir(), outputFilename)).exists()).toBeTrue();
    }, 15000);

    test("ignores injected scripts since JavaScript execution is disabled", async () => {
      const generator = await PdfGenerator.create();
      const html = `<html><body>
        <script>while (true) {}</script>
        Static content
      </body></html>`;

      const outputFilename = await renderToFile(generator, html, "js-disabled");

      expect(await Bun.file(join(envDataDir(), outputFilename)).exists()).toBeTrue();
    }, 15000);
  });
});
