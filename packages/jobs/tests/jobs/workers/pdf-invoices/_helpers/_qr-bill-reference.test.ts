import { describe, expect, test } from "bun:test";
import { isQRReferenceValid, isSCORReferenceValid } from "swissqrbill/utils";
import {
  buildQrBillReferenceCHF,
  buildQrBillReferenceEUR,
} from "../../../../../src/jobs/workers/pdf-invoices/_helpers/_qr-bill-reference";

const PAYMENT_REFERENCE = "48291736501928374615";
const IBAN = "CH9300762011623852957";
const QR_IBAN = "CH4431999123000889012";

describe("buildQrBillReferenceCHF", () => {
  test("returns a creditor reference for an IBAN", () => {
    const reference = buildQrBillReferenceCHF({ iban: IBAN, paymentReference: PAYMENT_REFERENCE });

    expect(reference).toBe("RF5648291736501928374615");
    expect(isSCORReferenceValid(reference)).toBeTrue();
  });

  test("returns a QR reference padded to 27 digits for a QR-IBAN", () => {
    const reference = buildQrBillReferenceCHF({
      iban: QR_IBAN,
      paymentReference: PAYMENT_REFERENCE,
    });

    expect(reference).toBe("000000482917365019283746159");
    expect(isQRReferenceValid(reference)).toBeTrue();
  });
});

describe("buildQrBillReferenceEUR", () => {
  test("returns a creditor reference for an IBAN", () => {
    const reference = buildQrBillReferenceEUR({ iban: IBAN, paymentReference: PAYMENT_REFERENCE });

    expect(reference).toBe("RF5648291736501928374615");
    expect(isSCORReferenceValid(reference)).toBeTrue();
  });

  test("throws for a QR-IBAN", () => {
    expect(() =>
      buildQrBillReferenceEUR({ iban: QR_IBAN, paymentReference: PAYMENT_REFERENCE }),
    ).toThrow("can only be used for invoices in CHF");
  });
});
