import { describe, expect, test } from "bun:test";
import { renderTemplate } from "../src/render";

describe("renderTemplate", () => {
  test("renders the outputs between double square brackets", async () => {
    await expect(
      renderTemplate({ template: "Hello [[ name ]]", data: { name: "nullish" } }),
    ).resolves.toBe("Hello nullish");
  });

  test("renders the tags between square brackets and percents", async () => {
    await expect(
      renderTemplate({
        template: "[% for item in items %][[ item ]][% endfor %]",
        data: { items: ["a", "b"] },
      }),
    ).resolves.toBe("ab");
  });

  test("does not render the default Liquid delimiters", async () => {
    await expect(
      renderTemplate({ template: "{{ name }} {% if name %}yes{% endif %}", data: { name: "x" } }),
    ).resolves.toBe("{{ name }} {% if name %}yes{% endif %}");
  });

  test("escapes the outputs", async () => {
    await expect(
      renderTemplate({ template: "[[ html ]]", data: { html: "<b>&</b>" } }),
    ).resolves.toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });

  test("does not escape the raw outputs", async () => {
    await expect(
      renderTemplate({ template: "[[ html | raw ]]", data: { html: "<svg></svg>" } }),
    ).resolves.toBe("<svg></svg>");
  });

  test("rejects an undefined variable", async () => {
    await expect(renderTemplate({ template: "[[ missing ]]", data: {} })).rejects.toThrow();
  });

  test("accepts an undefined variable in a condition", async () => {
    await expect(
      renderTemplate({ template: "[% if missing %]yes[% else %]no[% endif %]", data: {} }),
    ).resolves.toBe("no");
  });
});
