import { describe, expect, test } from "bun:test";
import {
  DefaultTemplateLanguage,
  InvoiceLineType,
  InvoiceStatus,
} from "@usenullish/nullish-schema/db";
import { InvoiceTemplateDataSchema } from "../../src/documents/schemas";
import { PDF_INVOICES_TEMPLATES } from "../../src/documents/templates";
import { renderHtmlTemplate } from "../../src/render";

const data = InvoiceTemplateDataSchema.parse({
  nullish: {
    organization: {
      name: "Acme Inc.",
      careOf: null,
      address: "1 Main Street",
      postalCode: "10001",
      city: "New York",
      email: "hello@acme.test",
      phone: "+12125550100",
      website: "https://acme.test",
      country: { code: "US", name: "United States" },
      iban: "CH93 0076 2011 6238 5295 7",
    },
    client: {
      name: "Client LLC",
      careOf: "c/o Jane Doe",
      address: "2 Side Street",
      postalCode: "8001",
      city: "Zürich",
      country: { code: "CH", name: "Switzerland" },
    },
    invoice: {
      number: "42",
      status: InvoiceStatus.OPEN,
      issueOn: "March 1, 2026",
      dueOn: "March 31, 2026",
      currency: "USD",
      subtotal: "USD 1,000.00",
      vat: "USD 81.00",
      vatRate: "8.1 %",
      total: "USD 1,081.00",
    },
    lines: [
      {
        type: InvoiceLineType.ITEM,
        description: "Consulting",
        quantity: "2.5",
        unitPrice: "USD 12.50",
      },
      {
        type: InvoiceLineType.DISCOUNT,
        description: "Loyalty",
        quantity: "1",
        unitPrice: "USD 5.00",
      },
    ],
    qrBill: '<svg data-qr-bill="true"></svg>',
  },
});

const minimalData = InvoiceTemplateDataSchema.parse({
  nullish: {
    organization: {
      name: "Acme Inc.",
      careOf: null,
      address: null,
      postalCode: null,
      city: null,
      email: null,
      phone: null,
      website: null,
      country: null,
      iban: null,
    },
    client: {
      name: "Client LLC",
      careOf: null,
      address: null,
      postalCode: null,
      city: null,
      country: null,
    },
    invoice: {
      number: null,
      status: InvoiceStatus.DRAFT,
      issueOn: "March 1, 2026",
      dueOn: null,
      currency: "USD",
      subtotal: "USD 0.00",
      vat: null,
      vatRate: null,
      total: "USD 0.00",
    },
    lines: [],
  },
});

describe("PDF_INVOICES_TEMPLATES", () => {
  test("has a template for each default language", () => {
    expect(Object.keys(PDF_INVOICES_TEMPLATES).sort()).toEqual(
      Object.values(DefaultTemplateLanguage).sort(),
    );
  });

  describe.each(Object.values(DefaultTemplateLanguage))("%s", (language) => {
    const template = PDF_INVOICES_TEMPLATES[language];

    test("is an HTML document in its language", () => {
      expect(template).toContain(`<html lang="${language}"`);
    });

    test("renders the invoice", async () => {
      const html = await renderHtmlTemplate({ template, data });

      expect(html).toContain("Acme Inc.");
      expect(html).toContain("Client LLC");
      expect(html).toContain("Consulting");
      expect(html).toContain("USD 1,081.00");
      expect(html).toContain('<svg data-qr-bill="true"></svg>');
    });

    test("renders a draft without optional data", async () => {
      const html = await renderHtmlTemplate({ template, data: minimalData });

      expect(html).toContain("Acme Inc.");
      expect(html).not.toContain("data-qr-bill");
    });
  });
});
