import * as z from "zod";
import { RecordsSchema } from "../../records";

export const ImportStatementsArgsSchema = z.strictObject({
  file: z.instanceof(Uint8Array),
});

export const ImportStatementsResultSchema = z.strictObject({
  statements: z.strictObject({
    processed: z.number().int().nonnegative(),
    ignored: z.number().int().nonnegative(),
  }),
  movements: z.strictObject({
    inserted: z.number().int().nonnegative(),
    existing: z.number().int().nonnegative(),
  }),
});

export const ReconcileMovementWithInvoiceArgsSchema = z.strictObject({
  type: z.literal("invoice"),
  invoiceId: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema.shape.id,
});

export const ReconcileMovementWithAccountArgsSchema = z.strictObject({
  type: z.literal("account"),
  accountId: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema.shape.id,
  description: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.description,
  vatRateId: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema.shape.vatRateId.optional(),
});

export const ReconcileMovementArgsSchema = z.discriminatedUnion("type", [
  ReconcileMovementWithInvoiceArgsSchema,
  ReconcileMovementWithAccountArgsSchema,
]);
