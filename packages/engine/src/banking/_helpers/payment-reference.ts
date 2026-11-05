import type { Option } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";

type CreditorReference = NonNullable<
  Records["Banking"]["Movements"]["Select"]["creditorReference"]
>;
type PaymentReference = NonNullable<Records["Billing"]["Invoices"]["Select"]["paymentReference"]>;

const QR_REFERENCE = /^\d{6}(\d{20})\d$/;
const CREDITOR_REFERENCE = /^RF\d{2}(\d{20})$/;

// Extracts the potential payment reference of an invoice from the QR reference or creditor reference
// a bank movement carries: the 20 digits in the middle of a QR reference (6 leading digits, 1 check
// digit) or after the "RF" and 2 check digits of a creditor reference. Spaces and letter case are
// ignored. Returns nothing when the reference does not have that shape.
//
// Examples:
// - "000000532139565642554536114" -> "53213956564255453611"
// - "RF56 4829 1736 5019 2837 4615" -> "48291736501928374615"
// - "RF18539007547034" -> undefined
export const toPaymentReference = ({
  creditorReference,
}: {
  creditorReference: CreditorReference;
}): Option<PaymentReference> => {
  const reference = creditorReference.replace(/\s/g, "").toUpperCase();

  return reference.match(QR_REFERENCE)?.[1] ?? reference.match(CREDITOR_REFERENCE)?.[1];
};
