import { describe, expect, test } from "bun:test";
import { LanguageCodeSchema } from "../../src/records/schemas/_language";

describe("LanguageCodeSchema", () => {
  test.each(["fr", "de", "it", "en", "es", "rm"])("accepts the language code %p", (code) => {
    expect(LanguageCodeSchema.safeParse(code).success).toBeTrue();
  });

  test.each(["zz", "xx", "qq"])("rejects the unknown language code %p", (code) => {
    expect(LanguageCodeSchema.safeParse(code).success).toBeFalse();
  });

  test.each(["FR", "fra", "f", "fr-CH", ""])(
    "rejects %p, which is not an ISO 639-1 code",
    (code) => {
      expect(LanguageCodeSchema.safeParse(code).success).toBeFalse();
    },
  );
});
