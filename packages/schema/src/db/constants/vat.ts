// Various types of Vat
// https://help.bexio.com/s/article/000001894?language=fr

export enum VatType {
  NET_RATE_TAX = "net_rate_tax", // UN81 - 8.10% - 6.20 % - 2200
  ACQUISITION_TAX_INVESTMENTS = "acquisition_tax_investments", // BZB81 - 8.10% - 1171
  ACQUISITION_TAX_MATERIALS = "acquisition_tax_materials", // BZM81 - 8.10% - 1170
  NON_CONSIDERATION = "non_consideration", // Prestations n'étant pas considérées comme des contre-prestations - SPE - 0.00% - 2200
  NON_TAXABLE_TURNOVER = "non_taxable_turnover", // Chiffre d'affaires non imposable - CEX - 0.00% - 220
  IMPORT_TAX_MATERIALS = "import_tax_materials", // DOUAM - 100.00% - 1170
  IMPORT_TAX_INVESTMENTS = "import_tax_investments", // DOUACE - 100.00% - 1171
  SALES_TAX_DUE = "sales_tax_due", // Taxe sur le chiffre d'affaires - TVA due - UN81 8.10% / UR26 2.60% / US38 3.80% - 2200
  INPUT_TAX_MATERIALS = "input_tax_materials", // Taxe en amont TVA matériel, marchandises, services et énergie - VM81 / VM26 / VM38 - 1170
  INPUT_TAX_INVESTMENTS = "input_tax_investments", // Taxe en amont TVA investissements, autres charges d'exploitation - VB81 / VB26 / VB38 - 1171
  // TODO: not supported currently
  // "opted_net_rate_tax", // Taxe de dette fiscale nette optée - Pour les produits agricoles obtenus dans l'exploitation propre
  // TODO: not supported currently
  // sales_tax_opted_vat_due, Taxe sur le chiffre d'affaires - TVA due optée
}

// VAT in Switzerland simplified
// https://www.bexio.com/en-CH/mwst-vat

export enum VatRemunerationMethod {
  AGREED = "agreed", // Contre-prestations convenues - VAT is due as soon as the company invoices its services.
  RECEIVED = "received", // Contre-prestations reçues - VAT is only due upon receipt of payment
}

export enum VatPaymentMethod {
  NET_RATE = "net_rate",
  EFFECTIVE = "effective",
}

export const INPUT_TAX_TYPES: VatType[] = [
  VatType.INPUT_TAX_MATERIALS,
  VatType.INPUT_TAX_INVESTMENTS,
];

export const ACQUISITION_TAX_TYPES: VatType[] = [
  VatType.ACQUISITION_TAX_MATERIALS,
  VatType.ACQUISITION_TAX_INVESTMENTS,
];

export const IMPORT_TAX_TYPES: VatType[] = [
  VatType.IMPORT_TAX_MATERIALS,
  VatType.IMPORT_TAX_INVESTMENTS,
];

export const INVOICE_VAT_TYPES: Record<VatPaymentMethod, VatType> = {
  [VatPaymentMethod.NET_RATE]: VatType.NET_RATE_TAX,
  [VatPaymentMethod.EFFECTIVE]: VatType.SALES_TAX_DUE,
};

// The VAT types for which the journal generates VAT postings when they are used on a posting:
// - input tax (e.g. VM81): the VAT included in the expense is recovered on 1170 or 1171.
// - acquisition tax (e.g. BZM81): the tax owed on a purchase from abroad is booked on 2203. It is
//   recovered on 1170 or 1171 with the effective method, or booked as a cost with the net rate method.
// - sales tax (e.g. UN81): the VAT included in the sale is owed on 2200.
// - net rate: the net rate of the sale is owed on 2200, as when an invoice is opened.
// The other types (non-taxable turnover, non-consideration, import tax) only tag the posting for the
// VAT declaration, no VAT postings are generated.
export const VAT_TYPES_WITH_GENERATED_POSTINGS: VatType[] = [
  ...INPUT_TAX_TYPES,
  ...ACQUISITION_TAX_TYPES,
  VatType.SALES_TAX_DUE,
  VatType.NET_RATE_TAX,
];

export enum VatPeriodStatus {
  OPEN = "open",
  CLOSED = "closed",
}

export const RATE_DECIMALS = 3;

// Divisor for percentage calculations: a rate in percent scaled with RATE_DECIMALS (e.g. 8.1% is
// 8100n), so the tax of an amount is amount × rate / RATE_SCALE_IN_PERCENT.
export const RATE_SCALE_IN_PERCENT = 10n ** BigInt(RATE_DECIMALS) * 100n;
