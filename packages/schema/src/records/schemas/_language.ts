import * as z from "zod";

const languageNames = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });

export const LanguageCodeSchema = z
  .string()
  .regex(/^[a-z]{2}$/, { abort: true })
  .refine((code) => languageNames.of(code) !== undefined)
  .describe("ISO 639-1 language code, e.g. fr");
