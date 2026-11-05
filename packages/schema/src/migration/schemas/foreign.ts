import * as z from "zod";
import { SystemAccountPurpose } from "../../db/constants/accounts-system";
import { RecordsSchema } from "../../records";
import { DateCodec, NotEmptyStringSchema } from "@usenullish/nullish-common";

const AccountSchema = RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema;

const CodeSchema = AccountSchema.shape.code.min(1, { message: "Required" });
const AccountTypeSchema = AccountSchema.shape.type;

export const ForeignAccountSchema = z.strictObject({
  name: z.string().optional(),
  type: AccountTypeSchema,
  code: CodeSchema,
  parentCode: CodeSchema.optional(),
  purpose: z.enum(SystemAccountPurpose).optional(),
});

export const ForeignAccountsSchema = z.array(ForeignAccountSchema);

export const ForeignBalanceSchema = z.strictObject({
  code: CodeSchema,
  amount: z.number(),
});

export const ForeignBalancesSchema = z.array(ForeignBalanceSchema);

export const ForeignOpeningBalancesSchema = z.strictObject({
  validOn: DateCodec,
  balances: ForeignBalancesSchema,
});

export const ForeignJournalLineSchema = z.strictObject({
  codes: z.strictObject({
    debit: CodeSchema,
    credit: CodeSchema,
  }),
  amount: z.number(),
  currency: z.string(),
  exchangeRate: z.number(),
  description: z.string().optional(),
  vat: z.string().optional(),
});

export const ForeignJournalEntrySchema = z.strictObject({
  reference: NotEmptyStringSchema,
  validOn: DateCodec,
  lines: z.array(ForeignJournalLineSchema).nonempty(),
});

export const ForeignJournalSchema = z.array(ForeignJournalEntrySchema);

const ClientTypeSchema = RecordsSchema.Billing.ClientsSchema.SelectClientsSchema.shape.type;
const CountrySchema = RecordsSchema.Billing.ClientsSchema.SelectClientsSchema.shape.country;

export const ForeignContactSchema = z.strictObject({
  lastName: NotEmptyStringSchema,
  firstName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export const ForeignClientSchema = z.strictObject({
  type: ClientTypeSchema,
  name: NotEmptyStringSchema,
  careOf: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: CountrySchema.optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  vatNumber: z.string().optional(),
  contacts: z.array(ForeignContactSchema),
});

export const ForeignClientsSchema = z.array(ForeignClientSchema);

// We are only interested in paid invoices for the migration
export const ForeignInvoiceStatusSchema = z.enum(["paid", "other"]);

export const ForeignInvoicePaymentSchema = z.strictObject({
  paidOn: DateCodec,
  amount: z.number(),
});

export const ForeignInvoiceSchema = z.strictObject({
  number: NotEmptyStringSchema,
  title: z.string().optional(),
  status: ForeignInvoiceStatusSchema,
  clientName: NotEmptyStringSchema,
  currency: NotEmptyStringSchema,
  netAmount: z.number(),
  grossAmount: z.number(),
  issueOn: DateCodec,
  dueOn: DateCodec.optional(),
  payments: z.array(ForeignInvoicePaymentSchema),
});

export const ForeignInvoicesSchema = z.array(ForeignInvoiceSchema);
