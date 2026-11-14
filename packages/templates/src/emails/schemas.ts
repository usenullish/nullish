import * as z from "zod";
import { RecordsSchema } from "@usenullish/nullish-schema/records";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";

const { SelectOrganizationsSchema } = RecordsSchema.Core.OrganizationsSchema;
const { SelectUsersSchema } = RecordsSchema.Auth.UsersSchema;

const EmailContentSchema = z.string().trim().min(1);

export const EmailSubjectsSchema = z.partialRecord(
  z.enum(DefaultTemplateLanguage),
  EmailContentSchema,
);

export const EmailTemplateSchema = z.strictObject({
  subject: EmailContentSchema,
  html: EmailContentSchema,
  text: EmailContentSchema,
});

export const VerifyEmailTemplateDataSchema = z.strictObject({
  nullish: z.strictObject({
    emailVerification: z.strictObject({
      url: z.url().describe("Link to verify the email address"),
    }),
  }),
});

export const ResetPasswordTemplateDataSchema = z.strictObject({
  nullish: z.strictObject({
    passwordReset: z.strictObject({
      url: z.url().describe("Link to choose a new password"),
    }),
  }),
});

export const InvitationTemplateDataSchema = z.strictObject({
  nullish: z.strictObject({
    organization: z.strictObject({
      name: SelectOrganizationsSchema.shape.name.describe("Name of the organization"),
    }),
    invitation: z.strictObject({
      url: z.url().describe("Link to open the invitation"),
      expiresOn: z
        .string()
        .describe("Date the invitation expires, formatted in the language of the email"),
      invitedBy: z.strictObject({
        name: SelectUsersSchema.shape.name.describe("Name of the person who sent the invitation"),
        email: SelectUsersSchema.shape.email.describe(
          "Email address of the person who sent the invitation",
        ),
      }),
    }),
  }),
});

export type VerifyEmailTemplateData = z.infer<typeof VerifyEmailTemplateDataSchema>;
export type ResetPasswordTemplateData = z.infer<typeof ResetPasswordTemplateDataSchema>;
export type InvitationTemplateData = z.infer<typeof InvitationTemplateDataSchema>;
