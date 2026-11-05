import {
  calculateQRReferenceChecksum,
  calculateSCORReferenceChecksum,
  isQRIBAN,
} from "swissqrbill/utils";
import type { Records } from "@usenullish/nullish-schema/records";

type BankRelation = Records["Core"]["BankRelations"]["Select"];

// ISO 11649 creditor reference: "RF", two check digits and up to 21 characters.
// https://en.wikipedia.org/wiki/Creditor_Reference
const CREDITOR_REFERENCE_PREFIX = "RF";

// QR reference: 26 digits freely assigned by the issuer plus one check digit.
// https://www.six-group.com/dam/download/banking-services/standardization/sps/business-rules-sps-2026-en.pdf
const QR_REFERENCE_PAYLOAD_LENGTH = 26;

/**
 * Used when the bank relation is a QR-Iban
 */
const buildQrReference = ({ paymentReference }: { paymentReference: string }): string => {
  const payload = paymentReference.padStart(QR_REFERENCE_PAYLOAD_LENGTH, "0");
  return `${payload}${calculateQRReferenceChecksum(payload)}`;
};

/**
 * Used when the bank relation is a regular Iban or the currency is not CHF i.e. is EUR.
 */
const buildCreditorReference = ({ paymentReference }: { paymentReference: string }): string =>
  `${CREDITOR_REFERENCE_PREFIX}${calculateSCORReferenceChecksum(paymentReference)}${paymentReference}`;

/**
 * Example: payment reference 48291736501928374615
 *
 * ┌─────────────────────────────────────────┬──────────────────────────────────┬──────────────────────────────────────────────────────────┐
 * │         Case                            │      Example (printed form)      │                         Made of                          │
 * ├─────────────────────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────────┤
 * │ Regular IBAN (Creditor Reference)       │ RF56 4829 1736 5019 2837 4615    │ RF + check digits 56 + the 20 digits (24 characters)     │
 * ├─────────────────────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────────┤
 * │ QR-IBAN without QR-ID                   │ 00 00004 82917 36501 92837 46159 │ 6 zeros + the 20 digits + check digit 9 (27 digits)      │
 * ├─────────────────────────────────────────┼──────────────────────────────────┼──────────────────────────────────────────────────────────┤
 * │ QR-IBAN with QR-ID                      │ 12 34564 82917 36501 92837 46157 │ QR-ID 123456 + the 20 digits + check digit 7 (27 digits) │
 * └─────────────────────────────────────────┴──────────────────────────────────┴──────────────────────────────────────────────────────────┘
 */
export const buildQrBillReferenceCHF = ({
  iban,
  paymentReference,
}: {
  iban: BankRelation["iban"];
  paymentReference: string;
}): string =>
  isQRIBAN(iban)
    ? buildQrReference({ paymentReference })
    : buildCreditorReference({ paymentReference });

// Since version 2.4 of the QR-bill guidelines, a QR-IBAN can only be used for invoicing in CHF.
// An invoice in EUR requires an IBAN with a Creditor Reference.
// https://www.six-group.com/dam/download/banking-services/standardization/qr-bill/ig-qr-bill-v2.4-en.pdf
// Reference: "Version 2.4 does not result in any technical adjustments for invoicing in Swiss francs (CHF). For invoicing in
// euros (EUR), only the combination IBAN/SCOR reference and IBAN/unstructured message is possible."
export const buildQrBillReferenceEUR = ({
  iban,
  paymentReference,
}: {
  iban: BankRelation["iban"];
  paymentReference: string;
}): string => {
  if (isQRIBAN(iban)) {
    throw new Error(`IBAN ${iban} is a QR-IBAN, which can only be used for invoices in CHF.`);
  }

  return buildCreditorReference({ paymentReference });
};
