import { SwissQRBill } from "swissqrbill/svg";
import type { Creditor, Data, Debtor, Language } from "swissqrbill/types";
import {
  convertUlpsToString,
  isNullish,
  type Nullable,
  type Option,
} from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import { buildQrBillReferenceCHF, buildQrBillReferenceEUR } from "./_qr-bill-reference";

type Invoice = Records["Billing"]["Invoices"]["Select"];
type Organization = Records["Core"]["Organizations"]["Select"];
type Client = Records["Billing"]["Clients"]["Select"];
type BankRelation = Records["Core"]["BankRelations"]["Select"];
type Currency = Records["Core"]["Currencies"]["Select"];
type TemplateContent = Records["Core"]["TemplateContents"]["Select"];

type OrganizationAddress = Pick<
  Organization,
  "name" | "address" | "postalCode" | "city" | "country"
>;
type ClientAddress = Pick<Client, "name" | "address" | "postalCode" | "city" | "country">;
type Address = OrganizationAddress | ClientAddress;

// TODO: constants for CHF and EUR
const isSupportedCurrency = (code: Currency["code"]): code is Data["currency"] =>
  ["CHF", "EUR"].includes(code);

const toDebtor = ({ name, address, postalCode, city, country }: Address): Option<Debtor> => {
  if (isNullish(address) || isNullish(postalCode) || isNullish(city) || isNullish(country)) {
    return undefined;
  }

  return { name, address, zip: postalCode, city, country };
};

// The list of languages supported by swissqrbill which the library exposes as type only
const LANGUAGES: Language[] = ["DE", "EN", "FR", "IT", "RM"];

const toLanguage = (language: TemplateContent["language"]): Language =>
  LANGUAGES.find((supported) => supported === language.toUpperCase()) ?? "EN";

const toCreditor = (address: OrganizationAddress): Option<Omit<Creditor, "account">> =>
  toDebtor(address);

interface QrBill {
  svg: string;
}

// A QR-bill can only be issued in CHF or EUR. For any other currency there is none.
export const buildQrBill = ({
  language,
  invoice,
  organization,
  client,
  bankRelation,
  currency,
  total,
}: {
  language: TemplateContent["language"];
  invoice: Pick<Invoice, "id" | "paymentReference">;
  organization: OrganizationAddress & Pick<Organization, "id">;
  client: OrganizationAddress & Pick<Client, "id">;
  bankRelation: Pick<BankRelation, "id" | "iban" | "invoiceIban">;
  currency: Pick<Currency, "code" | "decimals">;
  total: bigint;
}): Nullable<QrBill> => {
  if (!isSupportedCurrency(currency.code)) {
    return null;
  }

  const creditor = toCreditor(organization);

  if (isNullish(creditor)) {
    throw new Error(
      `Organization (ID ${organization.id}) has no complete address, which a QR-bill requires.`,
    );
  }

  if (isNullish(invoice.paymentReference)) {
    throw new Error(
      `Invoice (ID ${invoice.id}) has no payment reference, which a QR-bill requires.`,
    );
  }

  const buildQrReference =
    currency.code === "EUR" ? buildQrBillReferenceEUR : buildQrBillReferenceCHF;

  const account =
    currency.code === "EUR" ? bankRelation.iban : (bankRelation.invoiceIban ?? bankRelation.iban);

  const data: Data = {
    creditor: { ...creditor, account },
    debtor: toDebtor(client),
    currency: currency.code,
    amount: Number(convertUlpsToString({ ulps: total, decimals: currency.decimals })),
    reference: buildQrReference({
      iban: account,
      paymentReference: invoice.paymentReference,
    }),
  };

  const svg = new SwissQRBill(data, { language: toLanguage(language) }).toString();
  return { svg };
};
