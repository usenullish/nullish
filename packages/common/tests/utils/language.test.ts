import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { preferredLanguage } from "../../src/utils/language";

describe("preferredLanguage", () => {
  const languages = z.enum(["en", "fr", "de", "it"]);

  const request = (acceptLanguage?: string) =>
    new Request("https://nullish.example.com", {
      headers: acceptLanguage === undefined ? {} : { "Accept-Language": acceptLanguage },
    });

  test.each([
    ["fr", "fr"],
    ["de-CH", "de"],
    ["IT-it", "it"],
    ["fr-CH,fr;q=0.9,en;q=0.8", "fr"],
    ["en;q=0.5,de;q=0.9", "de"],
    ["es-ES,it;q=0.7", "it"],
    ["fr;q=0,en;q=0.1", "en"],
  ] as const)("accepts %p as %p", (acceptLanguage, lang) => {
    expect(preferredLanguage({ request: request(acceptLanguage), languages })).toBe(lang);
  });

  test.each(["", "es-ES", "ja,zh;q=0.9", "fr;q=0"])(
    "accepts no language for %p",
    (acceptLanguage) => {
      expect(preferredLanguage({ request: request(acceptLanguage), languages })).toBeUndefined();
    },
  );

  test("accepts no language without header", () => {
    expect(preferredLanguage({ request: request(), languages })).toBeUndefined();
  });

  test("ignores an invalid quality", () => {
    expect(preferredLanguage({ request: request("fr;q=abc,de;q=0.5"), languages })).toBe("de");
  });
});
