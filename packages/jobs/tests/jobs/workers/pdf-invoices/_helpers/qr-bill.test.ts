import { describe, expect, test } from "bun:test";
import { buildQrBill } from "../../../../../src/jobs/workers/pdf-invoices/_helpers/qr-bill";

const IBAN = "CH9300762011623852957";
const QR_IBAN = "CH4431999123000889012";

const organization = {
  id: crypto.randomUUID(),
  name: "Acme AG",
  address: "Bahnhofstrasse 1",
  postalCode: "8001",
  city: "Zürich",
  country: "CH",
};

const client = {
  id: crypto.randomUUID(),
  name: "Client SA",
  address: "Rue du Lac 2",
  postalCode: "1003",
  city: "Lausanne",
  country: "CH",
};

const invoice = { id: crypto.randomUUID(), paymentReference: "00000000120000000034" };

const bankRelation = { id: crypto.randomUUID(), iban: IBAN, invoiceIban: null };

const CHF = { code: "CHF", decimals: 2 };

describe("buildQrBill", () => {
  test("returns the payment part as an SVG with the creditor, the debtor and the amount", () => {
    const qrBill = buildQrBill({
      language: "en",
      invoice,
      organization,
      client,
      bankRelation,
      currency: CHF,
      total: 123450n,
    });

    expect(qrBill?.svg).toStartWith("<svg");
    expect(qrBill?.svg).toContain("CH93 0076 2011 6238 5295 7");
    expect(qrBill?.svg).toContain("Acme AG");
    expect(qrBill?.svg).toContain("Client SA");
    expect(qrBill?.svg).toContain("1 234.50");
  });

  test("returns the payment part in EUR", () => {
    const qrBill = buildQrBill({
      language: "en",
      invoice,
      organization,
      client,
      bankRelation,
      currency: { code: "EUR", decimals: 2 },
      total: 100n,
    });

    expect(qrBill?.svg).toStartWith("<svg");
    expect(qrBill?.svg).toContain("EUR");
  });

  test("renders the payment part in the language of the document", () => {
    const qrBill = buildQrBill({
      language: "fr",
      invoice,
      organization,
      client,
      bankRelation,
      currency: CHF,
      total: 100n,
    });

    expect(qrBill?.svg).toContain("Récépissé");
  });

  test("renders the payment part in English for a language the QR-bill does not support", () => {
    const qrBill = buildQrBill({
      language: "es",
      invoice,
      organization,
      client,
      bankRelation,
      currency: CHF,
      total: 100n,
    });

    expect(qrBill?.svg).toContain("Receipt");
  });

  test("returns null for a currency other than CHF or EUR", () => {
    const qrBill = buildQrBill({
      language: "en",
      invoice,
      organization,
      client,
      bankRelation,
      currency: { code: "USD", decimals: 2 },
      total: 100n,
    });

    expect(qrBill).toBeNull();
  });

  test("leaves the debtor out when the address of the client is incomplete", () => {
    const qrBill = buildQrBill({
      language: "en",
      invoice,
      organization,
      client: { ...client, city: null },
      bankRelation,
      currency: CHF,
      total: 100n,
    });

    expect(qrBill?.svg).toStartWith("<svg");
    expect(qrBill?.svg).not.toContain("Client SA");
  });

  test("throws when the address of the organization is incomplete", () => {
    expect(() =>
      buildQrBill({
        language: "en",
        invoice,
        organization: { ...organization, postalCode: null },
        client,
        bankRelation,
        currency: CHF,
        total: 100n,
      }),
    ).toThrow("has no complete address");
  });

  test("prints a creditor reference built from the payment reference for an IBAN", () => {
    const qrBill = buildQrBill({
      language: "en",
      invoice,
      organization,
      client,
      bankRelation,
      currency: CHF,
      total: 100n,
    });

    expect(qrBill?.svg).toContain("RF88 0000 0000 1200 0000 0034");
  });

  test("prints a QR-IBAN invoice IBAN with a QR reference built from the payment reference in CHF", () => {
    const qrBill = buildQrBill({
      language: "en",
      invoice,
      organization,
      client,
      bankRelation: { ...bankRelation, invoiceIban: QR_IBAN },
      currency: CHF,
      total: 100n,
    });

    expect(qrBill?.svg).toContain("CH44 3199 9123 0008 8901 2");
    expect(qrBill?.svg).not.toContain("CH93 0076 2011 6238 5295 7");
    expect(qrBill?.svg).toContain("00 00000 00000 00120 00000 00346");
  });

  test("prints the IBAN with a creditor reference in EUR for a QR-IBAN invoice IBAN", () => {
    const qrBill = buildQrBill({
      language: "en",
      invoice,
      organization,
      client,
      bankRelation: { ...bankRelation, invoiceIban: QR_IBAN },
      currency: { code: "EUR", decimals: 2 },
      total: 100n,
    });

    expect(qrBill?.svg).toContain("CH93 0076 2011 6238 5295 7");
    expect(qrBill?.svg).not.toContain("CH44 3199 9123 0008 8901 2");
    expect(qrBill?.svg).toContain("RF88 0000 0000 1200 0000 0034");
  });

  test("throws for a draft without a payment reference", () => {
    expect(() =>
      buildQrBill({
        language: "en",
        invoice: { ...invoice, paymentReference: null },
        organization,
        client,
        bankRelation,
        currency: CHF,
        total: 100n,
      }),
    ).toThrow("has no payment reference");
  });
});
