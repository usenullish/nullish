import * as z from "zod";
import type { Nullable } from "@usenullish/nullish-common";
import { PRIVACY_URL, TERMS_URL } from "~/env";

const LegalSchema = z.strictObject({
  termsUrl: z.url(),
  privacyUrl: z.url(),
});

export type Legal = z.infer<typeof LegalSchema>;

export const initLegal = (): Nullable<Legal> => {
  const { data } = LegalSchema.safeParse({ termsUrl: TERMS_URL, privacyUrl: PRIVACY_URL });
  return data ?? null;
};
