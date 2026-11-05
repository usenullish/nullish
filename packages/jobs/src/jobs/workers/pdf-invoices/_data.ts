import {
  assertNonNullish,
  formatAmount,
  formatDate,
  formatDecimal,
  formatIban,
  isNullish,
  type Option,
} from "@usenullish/nullish-common";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { CurrencyType, QUANTITY_DECIMALS, RATE_DECIMALS } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { type InvoiceTemplateData, InvoiceTemplateDataSchema } from "./_schema";

type Invoice = Records["Billing"]["Invoices"]["Select"];
type Line = Records["Billing"]["Lines"]["Select"];
type Organization = Records["Core"]["Organizations"]["Select"];
type Client = Records["Billing"]["Clients"]["Select"];
type BankRelation = Records["Core"]["BankRelations"]["Select"];
type Currency = Records["Core"]["Currencies"]["Select"];
type VatRate = Records["Core"]["VatRates"]["Select"];
type TemplateContent = Records["Core"]["TemplateContents"]["Select"];
type Amounts = Composites["InvoiceSummaries"]["Amounts"];

type Address = "careOf" | "address" | "postalCode" | "city" | "country";

export const buildInvoiceTemplateData = ({
  language,
  invoice,
  amounts: { totals },
  organization,
  client,
  bankRelation,
  currency,
  lines,
  vatRate,
  qrBill,
}: {
  language: TemplateContent["language"];
  invoice: Pick<Invoice, "number" | "status" | "issueOn" | "dueOn" | "currency">;
  amounts: Pick<Amounts, "totals">;
  organization: Pick<Organization, "name" | Address | "email" | "phone" | "website">;
  client: Pick<Client, "name" | Address>;
  bankRelation: Option<Pick<BankRelation, "iban">>;
  currency: Pick<Currency, "code" | "decimals" | "type">;
  lines: Pick<Line, "type" | "description" | "quantity" | "unitPrice">[];
  vatRate: Option<Pick<VatRate, "rate">>;
  qrBill: Option<string>;
}): InvoiceTemplateData => {
  const locale = isNullish(organization.country) ? language : `${language}-${organization.country}`;

  const toAmount = (amount: bigint): string => {
    const formatted = formatAmount({
      locale,
      amount,
      currency: {
        code: currency.code,
        decimals: currency.decimals,
        iso: currency.type !== CurrencyType.CRYPTO,
      },
    });

    assertNonNullish(
      formatted,
      `Unexpected error while preparing PDF: Amount ${amount} cannot be formatted.`,
    );

    return formatted;
  };

  const countryNames = new Intl.DisplayNames([language], { type: "region" });

  const toCountry = (code: Organization["country"] | Client["country"]) =>
    isNullish(code) ? null : { code, name: countryNames.of(code) };

  const toDecimal = ({
    value,
    maximumFractionDigits,
  }: {
    value: string;
    maximumFractionDigits: number;
  }): string => {
    const formatted = formatDecimal({ locale, value, maximumFractionDigits });

    assertNonNullish(
      formatted,
      `Unexpected error while preparing PDF: Value ${value} cannot be formatted.`,
    );

    return formatted;
  };

  return InvoiceTemplateDataSchema.parse({
    nullish: {
      organization: {
        name: organization.name,
        careOf: organization.careOf,
        address: organization.address,
        postalCode: organization.postalCode,
        city: organization.city,
        country: toCountry(organization.country),
        email: organization.email,
        phone: organization.phone,
        website: organization.website,
        iban: isNullish(bankRelation) ? null : formatIban(bankRelation.iban),
      },
      client: {
        name: client.name,
        careOf: client.careOf,
        address: client.address,
        postalCode: client.postalCode,
        city: client.city,
        country: toCountry(client.country),
      },
      invoice: {
        number: isNullish(invoice.number) ? null : `${invoice.number}`,
        status: invoice.status,
        issueOn: formatDate({ locale, date: invoice.issueOn }),
        dueOn: isNullish(invoice.dueOn) ? null : formatDate({ locale, date: invoice.dueOn }),
        currency: invoice.currency,
        subtotal: toAmount(totals.subtotal),
        vat: isNullish(vatRate) ? null : toAmount(totals.vat),
        vatRate: isNullish(vatRate)
          ? null
          : `${toDecimal({ value: `${vatRate.rate}`, maximumFractionDigits: RATE_DECIMALS })} %`,
        total: toAmount(totals.total),
      },
      lines: lines.map(({ type, description, quantity, unitPrice }) => ({
        type,
        description,
        quantity: toDecimal({ value: `${quantity}`, maximumFractionDigits: QUANTITY_DECIMALS }),
        unitPrice: toAmount(unitPrice),
      })),
      qrBill,
    },
  });
};
