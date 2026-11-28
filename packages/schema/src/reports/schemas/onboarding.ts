import * as z from "zod";

const OnboardingEntitySchema = z.strictObject({
  exists: z.boolean().describe("At least one exists."),
});

export const OnboardingResultSchema = z.strictObject({
  bankRelations: OnboardingEntitySchema.describe("The bank accounts of the organization."),
  clients: OnboardingEntitySchema.describe("The clients of the organization."),
  invoices: OnboardingEntitySchema.describe("The invoices of the organization, drafts included."),
});
