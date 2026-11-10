import { describe, expect, test } from "bun:test";
import { bundleDocs } from "../../src/macros/docs.macro";

const LANGUAGES = ["en", "de", "fr", "it"];

describe("bundleDocs", () => {
  test("bundles the pages indexed by language", async () => {
    const docs = await bundleDocs();

    expect(Object.keys(docs).toSorted()).toEqual(LANGUAGES.toSorted());
  });

  test("indexes each page under its own language", async () => {
    const docs = await bundleDocs();

    for (const [language, pages] of Object.entries(docs)) {
      expect(pages?.every((page) => page.language === language)).toBe(true);
    }
  });

  test("bundles the same pages in every language", async () => {
    const docs = await bundleDocs();

    const slugsOf = (language: string) => docs[language]?.map(({ slug }) => slug).toSorted();

    for (const language of LANGUAGES) {
      expect(slugsOf(language)).toEqual(slugsOf("en"));
    }
  });

  test("gives every page a title and a description", async () => {
    const pages = Object.values(await bundleDocs()).flat();

    expect(
      pages.every((page) => page !== undefined && page.title !== "" && page.description !== ""),
    ).toBe(true);
  });

  test("strips the frontmatter from the content", async () => {
    const pages = Object.values(await bundleDocs()).flat();

    expect(
      pages.every(
        (page) => page !== undefined && page.content !== "" && !page.content.startsWith("---"),
      ),
    ).toBe(true);
  });

  test("names a page after its path without the language and the extension", async () => {
    const { en } = await bundleDocs();

    expect(en).toContainEqual(expect.objectContaining({ slug: "accounting/vat", title: "VAT" }));
  });

  test("names an index page after its folder", async () => {
    const { en } = await bundleDocs();

    const slugs = en?.map(({ slug }) => slug);

    expect(slugs).toContain("accounting");
    expect(slugs?.some((slug) => slug.endsWith("index"))).toBe(false);
  });
});
