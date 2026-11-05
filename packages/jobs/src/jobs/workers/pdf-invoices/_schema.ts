import * as z from "zod";
import { RecordsSchema } from "@usenullish/nullish-schema/records";

const { InsertOrganizationsSchema, SelectOrganizationsSchema } =
  RecordsSchema.Core.OrganizationsSchema;
const { InsertClientsSchema, SelectClientsSchema } = RecordsSchema.Billing.ClientsSchema;
const { SelectInvoicesSchema, SelectLinesSchema } = RecordsSchema.Billing.InvoicesSchema;

const ADDRESS_FIELDS = {
  careOf: true,
  address: true,
  postalCode: true,
  city: true,
} as const;

const CountrySchema = z
  .strictObject({
    code: SelectOrganizationsSchema.shape.country
      .unwrap()
      .describe("ISO 3166-1 alpha-2 code of the country, e.g. CH"),
    name: z.string().describe("Name of the country in the language of the document"),
  })
  .nullable();

export const InvoiceTemplateDataSchema = z.strictObject({
  nullish: z.strictObject({
    organization: z.strictObject({
      name: SelectOrganizationsSchema.shape.name.describe(
        "Name of the organization issuing the invoice",
      ),
      ...InsertOrganizationsSchema.pick({
        ...ADDRESS_FIELDS,
        email: true,
        phone: true,
        website: true,
      }).shape,
      country: CountrySchema,
      iban: z
        .string()
        .nullable()
        .describe(
          "IBAN of the bank account chosen for the invoice, formatted in groups of four, null without bank account",
        ),
    }),
    client: z.strictObject({
      name: SelectClientsSchema.shape.name.describe("Name of the client the invoice is issued to"),
      ...InsertClientsSchema.pick(ADDRESS_FIELDS).shape,
      country: CountrySchema,
    }),
    invoice: z.strictObject({
      number: z.string().nullable().describe("Number of the invoice, null for a draft"),
      status: SelectInvoicesSchema.shape.status.describe(
        "Status of the invoice: draft, open, paid, uncollectible or void",
      ),
      issueOn: z.string().describe("Issue date, formatted in the language of the document"),
      dueOn: z.string().nullable().describe("Due date, formatted in the language of the document"),
      currency: SelectInvoicesSchema.shape.currency,
      subtotal: z.string().describe("Total of the lines without VAT, formatted with its currency"),
      vat: z
        .string()
        .nullable()
        .describe("VAT, formatted with its currency, null without VAT rate"),
      vatRate: z
        .string()
        .nullable()
        .describe("VAT rate in percent, e.g. 8.1 %, null without VAT rate"),
      total: z.string().describe("Total including VAT, formatted with its currency"),
    }),
    lines: z.array(
      z.strictObject({
        type: SelectLinesSchema.shape.type,
        description: SelectLinesSchema.shape.description,
        quantity: z.string().describe("Quantity, formatted in the language of the document"),
        unitPrice: z.string().describe("Unit price, formatted with its currency"),
      }),
    ),
    qrBill: z
      .string()
      .optional()
      .describe(
        "SVG of the QR-bill payment part, to insert unescaped with [[ nullish.qrBill | raw ]]. Absent for a draft or without bank account.",
      ),
  }),
});

export type InvoiceTemplateData = z.infer<typeof InvoiceTemplateDataSchema>;
