import * as z from "zod";

export const LanguagesSchema = z.enum(["en", "fr", "de", "it"]);
export type Languages = z.infer<typeof LanguagesSchema>;
