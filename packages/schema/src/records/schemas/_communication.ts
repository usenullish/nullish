import * as z from "zod";
import { LanguageCodeSchema } from "./_language";

const PhoneSchema = z.e164();

export const CommunicationSchema = z.strictObject({
  email: z.email().nullish(),
  phone: PhoneSchema.nullish().describe("Phone number in E.164 format, e.g. +41791234567"),
  website: z.url({ protocol: /^https?$/ }).nullish(),
  language: LanguageCodeSchema.nullish(),
});
