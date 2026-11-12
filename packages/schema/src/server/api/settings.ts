import * as z from "zod";

export const MailSettingsSchema = z.strictObject({
  enabled: z.boolean(),
});

export const SettingsSchema = z.strictObject({
  mail: MailSettingsSchema,
});

export const GetSettingsResponseSchema = z.strictObject({
  settings: SettingsSchema,
});
