import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { envDbUrl } from "@usenullish/nullish-env";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { PdfInvoicesWorker } from "../../../../src/jobs/workers/pdf-invoices/worker";
import {
  createBankRelation,
  createInvoice,
  createLine,
  createOrganization,
  createTemplate,
  createVatRate,
  openInvoice,
  resetDb,
  seedUser,
  TEST_USER_ID,
} from "../../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const prepare = ({
  invoiceId,
  templateId,
  bankRelationId,
}: {
  invoiceId: string;
  templateId: string;
  bankRelationId?: string;
}) =>
  PdfInvoicesWorker.create({
    payload: {
      userId: TEST_USER_ID,
      invoiceId,
      template: { type: "custom", id: templateId },
      bankRelationId,
    },
  }).prepare();

describe("PdfInvoicesWorker", () => {
  let orgId: string;
  let templateId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });

    orgId = await createOrganization({ db, withAddress: true });
    templateId = await createTemplate({ db, organizationId: orgId });
  });

  afterAll(async () => {
    await resetDb({ db });
    await client.close();
  });

  describe("prepare", () => {
    test("returns the HTML of the template content", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });

      const { html } = await prepare({ invoiceId, templateId });

      expect(html).toBe(
        "<html><body>Invoice [[ nullish.invoice.number ]] [% if nullish.qrBill %][[ nullish.qrBill | raw ]][% endif %]</body></html>",
      );
    });

    test("returns the organization, the client and the invoice under the nullish root", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId });

      expect(nullish.organization.city).toBe("Zürich");
      expect(nullish.client.name).toBe("Test Client");
      expect(nullish.invoice.number).toBeNull();
      expect(nullish.invoice.currency).toBe("CHF");
    });

    test("formats the data in the language of the template content", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });
      const germanTemplateId = await createTemplate({ db, organizationId: orgId, language: "de" });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId: germanTemplateId });

      expect(nullish.invoice.issueOn).toBe("01.01.2026");
    });

    test("returns the lines of the invoice in the order they were added", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });
      await createLine({ db, invoiceId, description: "First" });
      await createLine({ db, invoiceId, description: "Second" });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId });

      expect(nullish.lines.map(({ description }) => description)).toEqual(["First", "Second"]);
    });

    test("returns no line for an invoice without lines", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId });

      expect(nullish.lines).toEqual([]);
    });

    test("returns the VAT rate of the invoice", async () => {
      const vatRateId = await createVatRate({ db, organizationId: orgId });
      const invoiceId = await createInvoice({ db, organizationId: orgId, vatRateId });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId });

      expect(nullish.invoice.vatRate).toBe("8.1 %");
      expect(nullish.invoice.vat).not.toBeNull();
    });

    test("returns no VAT rate for an invoice without one", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId });

      expect(nullish.invoice.vatRate).toBeNull();
      expect(nullish.invoice.vat).toBeNull();
    });

    test("returns the QR-bill of an opened invoice with a bank relation", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });
      await openInvoice({ db, invoiceId });
      const bankRelationId = await createBankRelation({ db, organizationId: orgId });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId, bankRelationId });

      expect(nullish.qrBill).toStartWith("<svg");
      expect(nullish.invoice.number).not.toBeNull();
    });

    test("returns no QR-bill for a draft invoice with a bank relation", async () => {
      const otherOrgId = await createOrganization({ db, withAddress: true });
      const otherTemplateId = await createTemplate({ db, organizationId: otherOrgId });
      const invoiceId = await createInvoice({ db, organizationId: otherOrgId });
      const bankRelationId = await createBankRelation({ db, organizationId: otherOrgId });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId: otherTemplateId, bankRelationId });

      expect(nullish.qrBill).toBeUndefined();
    });

    test("returns no QR-bill without a bank relation", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });
      await openInvoice({ db, invoiceId });

      const {
        data: { nullish },
      } = await prepare({ invoiceId, templateId });

      expect(nullish.qrBill).toBeUndefined();
    });

    test("returns the HTML of the default template and its language", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });

      const { html, data } = await PdfInvoicesWorker.create({
        payload: {
          userId: TEST_USER_ID,
          invoiceId,
          template: { type: "default", language: DefaultTemplateLanguage.FR },
        },
      }).prepare();

      expect(html).toContain('<html lang="fr"');
      expect(html).toContain("[[ nullish.invoice.total ]]");
      expect(data.nullish.organization.country?.name).toBe("Suisse");
    });

    test("throws when the template content does not exist", async () => {
      const invoiceId = await createInvoice({ db, organizationId: orgId });

      await expect(prepare({ invoiceId, templateId: crypto.randomUUID() })).rejects.toThrow(
        "Template content",
      );
    });

    test("throws when the template belongs to another organization", async () => {
      const otherOrgId = await createOrganization({ db, withAddress: true });
      const otherTemplateId = await createTemplate({ db, organizationId: otherOrgId });
      const invoiceId = await createInvoice({ db, organizationId: orgId });

      await expect(prepare({ invoiceId, templateId: otherTemplateId })).rejects.toThrow(
        "does not belong to the organization",
      );
    });
  });
});
