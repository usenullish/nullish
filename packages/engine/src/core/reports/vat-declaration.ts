import type { Records } from "@usenullish/nullish-schema/records";
import { DbUserContext, type DbUserContextArgs } from "@usenullish/nullish-db";
import {
  assertNonNullish,
  divideAndRoundToNearest,
  nonNullish,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { getVatMethods, getVatPeriod } from "../_helpers/vat";
import { parseRate } from "../../_utils/vat";
import { getAccountingSetting } from "../_helpers/accounting-settings";
import {
  RATE_SCALE_IN_PERCENT,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import { type Reports, ReportsSchema } from "@usenullish/nullish-schema/reports";
import {
  getVatDeclarationBadDebts,
  getVatDeclarationExpenses,
  getVatDeclarationIncomes,
  getVatDeclarationInputTaxes,
  getVatDeclarationManualIncomes,
  getVatDeclarationNonConsiderations,
} from "../_helpers/vat-declaration";
import { EngineError } from "../../errors";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];

export type VatReportArgs = DbUserContextArgs & {
  organizationId: OrganizationId;
};

// TODO: document in the docs, once they exist, the boxes the app doesn't compute.
// Add these in the ESTV ePortal if they apply to you:
// - 205: Services excluded from tax for which you opted
// - 221: Services provided abroad
// - 230: Domestic services excluded from tax, without option
// - 235: Discounts, rebates and other reductions of consideration. Bad debts (invoices written off
//   with the agreed method) are computed; add the rest yourself.
// - 280: Miscellaneous (e.g. value of land, purchase prices under margin taxation)
// - 410 (effective method only): Subsequent input tax deduction (de-taxation)
// - 420 (effective method only): Input tax reductions (e.g. subsidies)
export class VatDeclarationReport extends DbUserContext {
  readonly #organizationId: OrganizationId;

  private constructor({ organizationId, ...rest }: VatReportArgs) {
    super(rest);

    this.#organizationId = organizationId;
  }

  static create(args: VatReportArgs): VatDeclarationReport {
    return new this(args);
  }

  generate(
    args: Reports["Vat"]["Declaration"]["Args"],
  ): Promise<Result<Reports["Vat"]["Declaration"]["Result"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 0. Validate the arguments
        const { vatPeriodId } = ReportsSchema.VatSchema.VatDeclarationArgsSchema.parse(args);

        const commonPayload = {
          tx,
          organizationId: this.#organizationId,
        };

        // 1. Get the vat period
        const { startOn, endOn } = await getVatPeriod({
          id: vatPeriodId,
          ...commonPayload,
        });

        // 2. Load the VAT methods of the fiscal year of the period and the accounting settings of the org
        const [methods, accountingSetting] = await Promise.all([
          getVatMethods({ ...commonPayload, validOn: startOn }),
          getAccountingSetting(commonPayload),
        ]);

        // 3. Assert VAT methods are configured and parameters are currently supported
        // i.e.
        // - Org base currency must be CHF
        assertNonNullish(
          methods,
          `No VAT methods configured for organization ${this.#organizationId} on ${startOn.toISOString()}`,
        );

        this.#assertSupportedSettings({ accountingSetting });

        // 4. Get the aggregated postings totals
        const payload = {
          ...commonPayload,
          startOn,
          endOn,
        };

        const [
          incomePostings,
          manualIncomePostings,
          expensePostings,
          nonConsiderationPostings,
          inputTaxPostings,
          badDebtPostings,
        ] = await Promise.all([
          getVatDeclarationIncomes({
            ...payload,
            remunerationMethod: methods.remunerationMethod,
          }),
          getVatDeclarationManualIncomes(payload),
          getVatDeclarationExpenses(payload),
          getVatDeclarationNonConsiderations(payload),
          getVatDeclarationInputTaxes(payload),
          methods.remunerationMethod === VatRemunerationMethod.AGREED
            ? getVatDeclarationBadDebts(payload)
            : Promise.resolve([]),
        ]);

        // Gross turnover / Income, VAT included
        // Base de chiffre d'affaires / Umsatzbasis
        // - invoices: their receivable. Agreed: debited when opened, credited back when voided.
        //   Received: credited by the payments.
        // - manual entries: the credits of the income accounts, minus their debits (e.g. a refund).
        const turnovers = [
          ...incomePostings.map(({ totalCredit, totalDebit, ...row }) => ({
            ...row,
            grossTurnover:
              methods.remunerationMethod === VatRemunerationMethod.AGREED
                ? (totalDebit ?? 0n) - (totalCredit ?? 0n)
                : (totalCredit ?? 0n),
          })),
          ...manualIncomePostings.map(({ totalCredit, totalDebit, ...row }) => ({
            ...row,
            grossTurnover: (totalCredit ?? 0n) - (totalDebit ?? 0n),
          })),
        ];

        // 5. Build report

        // --- SECTION BUCKETS (Base currency integer cents / Rappen) ---
        let box200_grossTurnover = 0n;
        // TODO: box 205 not supported yet

        let box220_exemptTurnover = 0n;
        // TODO: box 221 not supported yet
        let box225_subsidiesNonTurnover = 0n;
        // TODO: box 230 not supported yet
        // Box 235: only the bad debts are computed, not the discounts or rebates
        let box235_reductions = 0n;
        // TODO: box 280 not supported yet

        // Rate Buckets for Net Tax Rates (322/332 vs 323/333)
        const netRatesPost2024 = new Map<bigint, bigint>();
        const netRatesPre2024 = new Map<bigint, bigint>();

        // Rate Buckets for Sales Tax Rates, effective method (302/312/342 vs 303/313/343)
        const salesTaxRatesPost2024 = new Map<bigint, bigint>();
        const salesTaxRatesPre2024 = new Map<bigint, bigint>();

        // Acquisition Tax (Impôt sur les acquisitions / Bezugssteuer)
        let acquisitionTax: {
          pre2024: Reports["Vat"]["Declaration"]["Result"]["box382"];
          post2024: Reports["Vat"]["Declaration"]["Result"]["box383"];
        } = {
          pre2024: { taxableBase: 0n, taxAmount: 0n },
          post2024: { taxableBase: 0n, taxAmount: 0n },
        };

        // Section III & IV Adjustments
        let box415_inputTaxCorrections = 0n;
        let box470_specialExportRef = 0n;
        let box471_specialExportRef = 0n;

        let box910_donationsDividends = 0n;

        // TODO: extract function same as in invoice.open

        for (const { grossTurnover, ...row } of turnovers) {
          switch (row.type) {
            // --- SECTION I: TURNOVER (CHIFFRE D'AFFAIRES / UMSATZ) ---
            case VatType.NET_RATE_TAX:
              box200_grossTurnover += grossTurnover;

              if (nonNullish(row.netRate)) {
                const rateToken = parseRate(row.netRate);

                if (row.startOn.getTime() < new Date("2024-01-01").getTime()) {
                  const currentBase = netRatesPre2024.get(rateToken) ?? 0n;
                  netRatesPre2024.set(rateToken, currentBase + grossTurnover);
                  break;
                }

                const currentBase = netRatesPost2024.get(rateToken) ?? 0n;
                netRatesPost2024.set(rateToken, currentBase + grossTurnover);
              }
              break;

            // Effective method: the turnover is declared without VAT, the tax is the rate applied to it.
            case VatType.SALES_TAX_DUE: {
              const vatRate = parseRate(row.rate);
              const tax = divideAndRoundToNearest({
                value: grossTurnover * vatRate,
                divisor: RATE_SCALE_IN_PERCENT + vatRate,
              });

              const netTurnover = grossTurnover - tax;

              box200_grossTurnover += netTurnover;

              const rates =
                row.startOn.getTime() < new Date("2024-01-01").getTime()
                  ? salesTaxRatesPre2024
                  : salesTaxRatesPost2024;

              rates.set(vatRate, (rates.get(vatRate) ?? 0n) + netTurnover);
              break;
            }

            case VatType.NON_TAXABLE_TURNOVER:
              box200_grossTurnover += grossTurnover;
              box220_exemptTurnover += grossTurnover;
              break;
          }
        }

        // --- SECTION I: REDUCTIONS OF CONSIDERATION (ENTGELTSMINDERUNGEN), BAD DEBTS ---
        // An invoice written off with the agreed method was declared when it was opened. Its loss, the
        // unpaid gross amount, is deducted in Box 235 and from the base of its rate, so that the tax is
        // corrected too. With the effective method the loss is declared without VAT.
        for (const row of badDebtPostings) {
          const grossLoss = row.totalCredit ?? 0n;

          switch (row.type) {
            case VatType.NET_RATE_TAX:
              if (nonNullish(row.netRate)) {
                const rateToken = parseRate(row.netRate);
                const rates =
                  row.startOn.getTime() < new Date("2024-01-01").getTime()
                    ? netRatesPre2024
                    : netRatesPost2024;

                rates.set(rateToken, (rates.get(rateToken) ?? 0n) - grossLoss);
              }

              box235_reductions += grossLoss;
              break;

            case VatType.SALES_TAX_DUE: {
              const vatRate = parseRate(row.rate);
              const tax = divideAndRoundToNearest({
                value: grossLoss * vatRate,
                divisor: RATE_SCALE_IN_PERCENT + vatRate,
              });

              const netLoss = grossLoss - tax;

              const rates =
                row.startOn.getTime() < new Date("2024-01-01").getTime()
                  ? salesTaxRatesPre2024
                  : salesTaxRatesPost2024;

              rates.set(vatRate, (rates.get(vatRate) ?? 0n) - netLoss);

              box235_reductions += netLoss;
              break;
            }

            // The exempt turnover was already deducted in Box 220, the loss reduces it instead of being
            // deducted twice.
            case VatType.NON_TAXABLE_TURNOVER:
              box220_exemptTurnover -= grossLoss;
              box235_reductions += grossLoss;
              break;
          }
        }

        for (const row of nonConsiderationPostings) {
          // --- SECTION IV: NON-CONSIDERATIONS (NICHT-ENTGELTE) ---
          // Donations, dividends, damages... are NOT turnover:
          // They do not enter Box 200, nor Box 225. They only appear in Section IV (Box 910).
          box910_donationsDividends += (row.totalCredit ?? 0n) - (row.totalDebit ?? 0n);
        }

        for (const row of expensePostings) {
          switch (row.type) {
            // --- SECTION II: ACQUISITION TAX (BEZUGSSTEUER) ---
            case VatType.ACQUISITION_TAX_INVESTMENTS:
            case VatType.ACQUISITION_TAX_MATERIALS: {
              // Expenses / Purchases (for Acquisition Tax / Bezugssteuer) are tracked on totalDebit.
              // Base de dépenses / Aufwandsbasis
              // - net rate method: the acquisition tax is booked as a cost next to the purchase (generated
              //   by the journal VAT postings), totalDebit is therefore a gross amount including the tax.
              // - effective method: the acquisition tax is booked on the input tax account, totalDebit is
              //   the purchase without the tax.
              const expense = row.totalDebit ?? 0n;

              const vatRate = parseRate(row.rate);

              const tax =
                methods.paymentMethod === VatPaymentMethod.EFFECTIVE
                  ? divideAndRoundToNearest({
                      value: expense * vatRate,
                      divisor: RATE_SCALE_IN_PERCENT,
                    })
                  : divideAndRoundToNearest({
                      value: expense * vatRate,
                      divisor: RATE_SCALE_IN_PERCENT + vatRate,
                    });

              const expenseBase =
                methods.paymentMethod === VatPaymentMethod.EFFECTIVE ? expense : expense - tax;

              const rowPre2024 = row.startOn.getTime() < new Date("2024-01-01").getTime();

              const { pre2024, post2024 } = acquisitionTax;

              acquisitionTax = {
                pre2024: rowPre2024
                  ? {
                      taxableBase: pre2024.taxableBase + expenseBase,
                      taxAmount: pre2024.taxAmount + tax,
                    }
                  : pre2024,
                post2024: rowPre2024
                  ? post2024
                  : {
                      taxableBase: post2024.taxableBase + expenseBase,
                      taxAmount: post2024.taxAmount + tax,
                    },
              };
              break;
            }
          }
        }

        // --- SECTION III: INPUT TAX (VORSTEUER), EFFECTIVE METHOD ---
        // Materials and services (Box 400) vs investments and other operating costs (Box 405)
        let box400_inputTaxMaterials = 0n;
        let box405_inputTaxInvestments = 0n;

        for (const row of inputTaxPostings) {
          const inputTax = (row.totalDebit ?? 0n) - (row.totalCredit ?? 0n);

          switch (row.type) {
            case VatType.INPUT_TAX_MATERIALS:
            case VatType.IMPORT_TAX_MATERIALS:
            case VatType.ACQUISITION_TAX_MATERIALS:
              box400_inputTaxMaterials += inputTax;
              break;

            case VatType.INPUT_TAX_INVESTMENTS:
            case VatType.IMPORT_TAX_INVESTMENTS:
            case VatType.ACQUISITION_TAX_INVESTMENTS:
              box405_inputTaxInvestments += inputTax;
              break;
          }
        }

        // --- DERIVED CALCULATIONS ---

        // Box 289: Total Deductions (220 + 221 + 225 + 230 + 235)
        const box289_totalDeductions =
          box220_exemptTurnover + box225_subsidiesNonTurnover + box235_reductions;

        // Box 299: Taxable Turnover Base (200 - 289)
        const box299_taxableTurnover = box200_grossTurnover - box289_totalDeductions;

        // Calculated Net Rate and Sales Tax Amounts
        // Montants de taxe calculés / Berechnete Steuerbeträge
        const toRateTaxes = (rates: Map<bigint, bigint>) =>
          Array.from(rates.entries()).map(([rate, taxableBase]) => {
            const taxAmount = divideAndRoundToNearest({
              value: taxableBase * rate,
              divisor: RATE_SCALE_IN_PERCENT,
            });

            return {
              rate,
              taxableBase,
              taxAmount,
            };
          });

        const netRateTaxesPre2024 = toRateTaxes(netRatesPre2024);
        const netRateTaxesPost2024 = toRateTaxes(netRatesPost2024);
        const salesTaxesPre2024 = toRateTaxes(salesTaxRatesPre2024);
        const salesTaxesPost2024 = toRateTaxes(salesTaxRatesPost2024);

        // Total de l'impôt calculé sur le chiffre d'affaires
        const totalRateTaxes = (rates: ReturnType<typeof toRateTaxes>) =>
          rates.reduce((acc, item) => acc + item.taxAmount, 0n);

        const totalNetRateTaxOwed =
          totalRateTaxes(netRateTaxesPre2024) + totalRateTaxes(netRateTaxesPost2024);

        const totalSalesTaxOwed =
          totalRateTaxes(salesTaxesPre2024) + totalRateTaxes(salesTaxesPost2024);

        // Box 399: Total Calculated VAT Liability (Slot 1 + Slot 2 + Bezugssteuer)
        // Rubrique 399 : Total TVA due / Total geschuldete MWST (Slot 1 + Slot 2 + Bezugssteuer)
        const box399_taxSubtotal =
          totalNetRateTaxOwed +
          totalSalesTaxOwed +
          acquisitionTax.pre2024.taxAmount +
          acquisitionTax.post2024.taxAmount;

        // Section III: Adjustments & Corrections
        // Box 479: what is deducted from the tax owed, according to the form of the payment method:
        // - effective: total of boxes 400 to 420, i.e. the input tax minus its corrections;
        // - net rate: total of boxes 470 and 471, the tax credits of forms 1050 and 1055.
        // Rubrique 479 : Total des chiffres 400 à 420 (effective) ou 470 à 471 (taux de la dette fiscale nette)
        const box479_specialCorrections =
          methods.paymentMethod === VatPaymentMethod.EFFECTIVE
            ? box400_inputTaxMaterials + box405_inputTaxInvestments - box415_inputTaxCorrections
            : box470_specialExportRef + box471_specialExportRef;

        // Box 500: Final Total VAT Owed to ESTV (399 - 479)
        // Rubrique 500 : Solde final à payer à l'AFC / Endgültig an die ESTV zu zahlender Betrag (399 - 479)
        const box500_finalAmountPayable = box399_taxSubtotal - box479_specialCorrections;

        // Box 510: Refund Claim (If total payable is negative)
        // Rubrique 510 : Solde en faveur du contribuable / Guthaben der steuerpflichtigen Person
        const box510_refundClaim = box500_finalAmountPayable < 0n ? -box500_finalAmountPayable : 0n;
        const finalPayableOrZero = box500_finalAmountPayable > 0n ? box500_finalAmountPayable : 0n;

        const report = {
          // SECTION I: TURNOVER & DEDUCTIONS (CHIFFRE D'AFFAIRES ET DÉDUCTIONS / UMSATZ & ABZÜGE)
          box200: box200_grossTurnover,
          box220: box220_exemptTurnover,
          box225: box225_subsidiesNonTurnover,
          box235: box235_reductions,
          box289: box289_totalDeductions,
          box299: box299_taxableTurnover,

          // SECTION II: TAX CALCULATION (CALCUL DE L'IMPÔT / STEUERBERECHNUNG)
          box323: netRateTaxesPost2024,
          box322: netRateTaxesPre2024,

          box383: acquisitionTax.post2024,
          box382: acquisitionTax.pre2024,

          box303: salesTaxesPost2024,
          box302: salesTaxesPre2024,

          box399: box399_taxSubtotal,

          box400: box400_inputTaxMaterials,
          box405: box405_inputTaxInvestments,

          // SECTION III: CORRECTIONS & TOTALS (CORRECTIONS ET TOTAUX / BERICHTIGUNGEN & TOTALS)
          box415: box415_inputTaxCorrections,
          box470: box470_specialExportRef,
          box471: box471_specialExportRef,
          box479: box479_specialCorrections,
          box500: finalPayableOrZero,
          box510: box510_refundClaim,

          // SECTION IV: INFORMATIONAL RECEIPTS (AUTRES FLUX DE FONDS / ANDERE MITTELFLÜSSE)
          box910: box910_donationsDividends,
        };

        return ReportsSchema.VatSchema.VatDeclarationResultSchema.parse(report);
      });
    });
  }

  #assertSupportedSettings({
    accountingSetting,
  }: {
    accountingSetting: Records["Core"]["AccountingSettings"]["Select"];
  }) {
    // The declaration is filed in CHF, postings are aggregated in the base currency of the org.
    if (accountingSetting.baseCurrency !== "CHF") {
      throw new EngineError(
        "Only organizations with CHF as base currency are currently supported.",
      );
    }
  }
}
