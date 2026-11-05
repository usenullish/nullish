import { describe, expect, test } from "bun:test";
import { CurrencyType, InvoiceLineType, InvoiceStatus } from "@usenullish/nullish-schema/db";
import { buildInvoiceTemplateData } from "../../../../src/jobs/workers/pdf-invoices/_data";

const organization = {
  name: "Acme Inc.",
  careOf: null,
  address: "1 Main Street",
  postalCode: "10001",
  city: "New York",
  country: "US",
  email: "hello@acme.test",
  phone: "+12125550100",
  website: "https://acme.test",
};

const client = {
  name: "Client LLC",
  careOf: "c/o Jane Doe",
  address: "2 Side Street",
  postalCode: "94105",
  city: "San Francisco",
  country: "US",
};

const bankRelation = { iban: "CH9300762011623852957" };

const invoice = {
  number: 42,
  status: InvoiceStatus.OPEN,
  issueOn: new Date(Date.UTC(2026, 2, 1)),
  dueOn: new Date(Date.UTC(2026, 2, 31)),
  currency: "USD",
};

const amounts = { totals: { subtotal: 100000n, vat: 8100n, total: 108100n } };

const USD = { code: "USD", decimals: 2, type: CurrencyType.FIAT };

const lines = [
  {
    type: InvoiceLineType.ITEM,
    description: "Consulting",
    quantity: 2.5,
    unitPrice: 1250n,
  },
  {
    type: InvoiceLineType.DISCOUNT,
    description: "Loyalty",
    quantity: 1,
    unitPrice: 500n,
  },
];

const build = (args: Partial<Parameters<typeof buildInvoiceTemplateData>[0]> = {}) =>
  buildInvoiceTemplateData({
    language: "en",
    invoice,
    amounts,
    organization,
    client,
    bankRelation,
    currency: USD,
    lines,
    vatRate: { rate: 8.1 },
    qrBill: "<svg></svg>",
    ...args,
  });

describe("buildInvoiceTemplateData", () => {
  test("puts the data under the nullish root", () => {
    expect(Object.keys(build())).toEqual(["nullish"]);
  });

  test("returns the organization with its address, communication and IBAN", () => {
    expect(build().nullish.organization).toEqual({
      ...organization,
      country: { code: "US", name: "United States" },
      iban: "CH93 0076 2011 6238 5295 7",
    });
  });

  test("returns no IBAN without bank account", () => {
    expect(build({ bankRelation: undefined }).nullish.organization.iban).toBeNull();
  });

  test("returns the client with its address", () => {
    expect(build().nullish.client).toEqual({
      ...client,
      country: { code: "US", name: "United States" },
    });
  });

  test("names the countries in the language of the document", () => {
    const { organization, client } = build({ language: "de" }).nullish;

    expect(organization.country?.name).toBe("Vereinigte Staaten");
    expect(client.country?.name).toBe("Vereinigte Staaten");
  });

  test("returns no country when the organization or the client has none", () => {
    const { nullish } = build({
      organization: { ...organization, country: null },
      client: { ...client, country: null },
    });

    expect(nullish.organization.country).toBeNull();
    expect(nullish.client.country).toBeNull();
  });

  test("returns the number of the invoice as text", () => {
    expect(build().nullish.invoice.number).toBe("42");
  });

  test("returns the status of the invoice", () => {
    expect(build().nullish.invoice.status).toBe(InvoiceStatus.OPEN);
  });

  test("returns the draft status of a draft", () => {
    const data = build({ invoice: { ...invoice, number: null, status: InvoiceStatus.DRAFT } });

    expect(data.nullish.invoice.status).toBe(InvoiceStatus.DRAFT);
  });

  test("returns no number for a draft", () => {
    expect(build({ invoice: { ...invoice, number: null } }).nullish.invoice.number).toBeNull();
  });

  test("formats the dates in the language of the document and the country of the organization", () => {
    const { issueOn, dueOn } = build().nullish.invoice;

    expect(issueOn).toBe("03/01/2026");
    expect(dueOn).toBe("03/31/2026");
  });

  test("formats the dates in the language of the document alone when the organization has no country", () => {
    const data = build({ language: "de", organization: { ...organization, country: null } });

    expect(data.nullish.invoice.issueOn).toBe("01.03.2026");
  });

  test("returns no due date when the invoice has none", () => {
    expect(build({ invoice: { ...invoice, dueOn: null } }).nullish.invoice.dueOn).toBeNull();
  });

  test("formats the totals with the currency", () => {
    const { subtotal, vat, total } = build().nullish.invoice;

    expect(subtotal).toBe("$1,000.00");
    expect(vat).toBe("$81.00");
    expect(total).toBe("$1,081.00");
  });

  test("formats the VAT rate in percent", () => {
    expect(build().nullish.invoice.vatRate).toBe("8.1 %");
  });

  test("returns no VAT nor VAT rate when the invoice has no VAT rate", () => {
    const { vat, vatRate } = build({ vatRate: undefined }).nullish.invoice;

    expect(vat).toBeNull();
    expect(vatRate).toBeNull();
  });

  test("formats the quantity and the unit price of the lines in their order", () => {
    expect(build().nullish.lines).toEqual([
      {
        type: InvoiceLineType.ITEM,
        description: "Consulting",
        quantity: "2.5",
        unitPrice: "$12.50",
      },
      { type: InvoiceLineType.DISCOUNT, description: "Loyalty", quantity: "1", unitPrice: "$5.00" },
    ]);
  });

  test("appends the code of a currency that is not ISO 4217", () => {
    const data = build({
      invoice: { ...invoice, currency: "BTC" },
      amounts: { totals: { subtotal: 150000000n, vat: 0n, total: 150000000n } },
      currency: { code: "BTC", decimals: 8, type: CurrencyType.CRYPTO },
      vatRate: undefined,
    });

    expect(data.nullish.invoice.total).toBe("1.5 BTC");
  });

  test("returns the QR-bill", () => {
    expect(build().nullish.qrBill).toBe("<svg></svg>");
  });

  test("returns no QR-bill when there is none", () => {
    expect(build({ qrBill: undefined }).nullish.qrBill).toBeUndefined();
  });

  test("throws when the data does not match the schema", () => {
    expect(() => build({ organization: { ...organization, email: "not an email" } })).toThrow();
  });
});
