import * as z from "zod";

export const OnboardingResultSchema = z.strictObject({
  hasClients: z.boolean().describe("At least one client exists."),
  hasInvoices: z.boolean().describe("At least one invoice exists, drafts included."),
  hasBankRelations: z.boolean().describe("At least one bank account exists."),
  hasStatements: z.boolean().describe("At least one bank statement was imported."),
});
