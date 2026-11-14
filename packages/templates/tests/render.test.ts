import { describe, expect, test } from "bun:test";
import { renderHtmlTemplate, renderTextTemplate } from "../src/render";

describe("renderTextTemplate", () => {
  test("renders the outputs and the tags with the same delimiters", async () => {
    await expect(
      renderTextTemplate({
        template: "[% if name %]Hello [[ name ]][% endif %]",
        data: { name: "nullish" },
      }),
    ).resolves.toBe("Hello nullish");
  });

  test("does not escape the outputs", async () => {
    await expect(
      renderTextTemplate({ template: "[[ name ]]", data: { name: "Acme & Co <hello>" } }),
    ).resolves.toBe("Acme & Co <hello>");
  });

  test("rejects an undefined variable", async () => {
    await expect(renderTextTemplate({ template: "[[ missing ]]", data: {} })).rejects.toThrow();
  });
});

describe("renderHtmlTemplate", () => {
  test("renders the outputs between double square brackets", async () => {
    await expect(
      renderHtmlTemplate({ template: "Hello [[ name ]]", data: { name: "nullish" } }),
    ).resolves.toBe("Hello nullish");
  });

  test("renders the tags between square brackets and percents", async () => {
    await expect(
      renderHtmlTemplate({
        template: "[% for item in items %][[ item ]][% endfor %]",
        data: { items: ["a", "b"] },
      }),
    ).resolves.toBe("ab");
  });

  test("does not render the default Liquid delimiters", async () => {
    await expect(
      renderHtmlTemplate({ template: "{{ name }} {% if name %}yes{% endif %}", data: { name: "x" } }),
    ).resolves.toBe("{{ name }} {% if name %}yes{% endif %}");
  });

  test("escapes the outputs", async () => {
    await expect(
      renderHtmlTemplate({ template: "[[ html ]]", data: { html: "<b>&</b>" } }),
    ).resolves.toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });

  test("does not escape the raw outputs", async () => {
    await expect(
      renderHtmlTemplate({ template: "[[ html | raw ]]", data: { html: "<svg></svg>" } }),
    ).resolves.toBe("<svg></svg>");
  });

  test("rejects an undefined variable", async () => {
    await expect(renderHtmlTemplate({ template: "[[ missing ]]", data: {} })).rejects.toThrow();
  });

  test("accepts an undefined variable in a condition", async () => {
    await expect(
      renderHtmlTemplate({ template: "[% if missing %]yes[% else %]no[% endif %]", data: {} }),
    ).resolves.toBe("no");
  });
});
