import { isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  ACQUISITION_TAX_TYPES,
  IMPORT_TAX_TYPES,
  INPUT_TAX_TYPES,
  INVOICE_VAT_TYPES,
  VatPaymentMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import type { JournalPostingSide } from "~/context/form/_journal.form";

type VatRate = Api["VatRates"]["Client"]["VatRate"];
type VatMethod = Api["VatMethods"]["Client"]["VatMethod"];
type Period = Api["Periods"]["Client"]["Period"];

// Which VAT types can be used with which VAT payment method. The database enforces the same rule on
// the postings (ledger.check_posting_vat_rate_methods), this copy only spares the user from picking a
// rate that would be rejected.
// - Net rate method: the VAT owed is the net rate granted by the tax administration applied to the
//   turnover. There is no sales tax and no input tax to recover.
// - Effective method: the VAT of the sales is owed and the VAT of the purchases (input tax, import tax)
//   is recovered.
// The acquisition tax and the codes without tax (non-taxable turnover, non-consideration) exist with
// both methods.
const VAT_TYPE_PAYMENT_METHODS: Record<VatType, VatPaymentMethod[]> = {
  [VatType.NET_RATE_TAX]: [VatPaymentMethod.NET_RATE],
  [VatType.SALES_TAX_DUE]: [VatPaymentMethod.EFFECTIVE],
  [VatType.INPUT_TAX_MATERIALS]: [VatPaymentMethod.EFFECTIVE],
  [VatType.INPUT_TAX_INVESTMENTS]: [VatPaymentMethod.EFFECTIVE],
  [VatType.IMPORT_TAX_MATERIALS]: [VatPaymentMethod.EFFECTIVE],
  [VatType.IMPORT_TAX_INVESTMENTS]: [VatPaymentMethod.EFFECTIVE],
  [VatType.ACQUISITION_TAX_MATERIALS]: [VatPaymentMethod.NET_RATE, VatPaymentMethod.EFFECTIVE],
  [VatType.ACQUISITION_TAX_INVESTMENTS]: [VatPaymentMethod.NET_RATE, VatPaymentMethod.EFFECTIVE],
  [VatType.NON_TAXABLE_TURNOVER]: [VatPaymentMethod.NET_RATE, VatPaymentMethod.EFFECTIVE],
  [VatType.NON_CONSIDERATION]: [VatPaymentMethod.NET_RATE, VatPaymentMethod.EFFECTIVE],
};

const isVatRateValidOn = ({ rate, date }: { rate: VatRate; date: string }): boolean => {
  const day = new Date(date).getTime();

  return (
    !Number.isNaN(day) &&
    rate.startOn.getTime() <= day &&
    (isNullish(rate.endOn) || day <= rate.endOn.getTime())
  );
};

// The side of a journal line the VAT rate is suggested on when the user selects it. The purchase
// codes (input tax, acquisition tax, import tax) usually go with an expense or an asset, which is
// debited. The others (sales tax, net rate, non-taxable turnover, non-consideration) usually go with
// an income, which is credited.
export const defaultVatSide = ({ rate }: { rate: Option<VatRate> }): JournalPostingSide =>
  nonNullish(rate) &&
  [...INPUT_TAX_TYPES, ...ACQUISITION_TAX_TYPES, ...IMPORT_TAX_TYPES].includes(rate.type)
    ? "debit"
    : "credit";

// A VAT rate can be picked on a date when it is valid on that date and its type is allowed with the
// payment method of the fiscal year of the date. Without VAT methods for that year there is nothing to
// compare with, so the rate is offered and the server tells what is missing.
export const isVatRateUsableOn = ({
  rate,
  date,
  vatMethods,
  periods,
}: {
  rate: VatRate;
  date: string;
  vatMethods: VatMethod[];
  periods: Period[];
}): boolean => {
  if (!isVatRateValidOn({ rate, date })) {
    return false;
  }

  const method = findVatMethodOn({ date, vatMethods, periods });

  return isNullish(method) || VAT_TYPE_PAYMENT_METHODS[rate.type].includes(method.paymentMethod);
};

export const isInvoiceVatRateUsableOn = ({
  rate,
  date,
  vatMethods,
  periods,
}: {
  rate: VatRate;
  date: string;
  vatMethods: VatMethod[];
  periods: Period[];
}): boolean => {
  if (!isVatRateUsableOn({ rate, date, vatMethods, periods })) {
    return false;
  }

  const method = findVatMethodOn({ date, vatMethods, periods });

  return isNullish(method) || rate.type === INVOICE_VAT_TYPES[method.paymentMethod];
};

const findVatMethodOn = ({
  date,
  vatMethods,
  periods,
}: {
  date: string;
  vatMethods: VatMethod[];
  periods: Period[];
}): Option<VatMethod> => {
  const day = new Date(date).getTime();

  const period = periods.find(
    ({ startOn, endOn }) => startOn.getTime() <= day && day <= endOn.getTime(),
  );

  return vatMethods.find(({ periodId }) => periodId === period?.id);
};
