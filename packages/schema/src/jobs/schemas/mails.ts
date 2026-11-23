import * as z from "zod";
import { SelectOrganizationsSchema } from "../../records/schemas/core/organizations";
import { DefaultTemplateLanguage } from "../../db/constants/documents";
import { EmptyJobResultSchema, JobPayloadSchema } from "./common";
import { MailJobType } from "../_constants";

export const SubscriptionTrialReminderMailPayloadSchema = z.strictObject({
  ...JobPayloadSchema.shape,
  type: z.literal(MailJobType.SubscriptionTrialReminder),
  organizationId: SelectOrganizationsSchema.shape.id,
  lang: z.enum(DefaultTemplateLanguage),
});

export const MailPayloadSchema = z.discriminatedUnion("type", [
  SubscriptionTrialReminderMailPayloadSchema,
]);

export const MailResultSchema = EmptyJobResultSchema;
