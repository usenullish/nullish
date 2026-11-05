import * as z from "zod";
import { RecordsSchema } from "../../records";

export const VatDeclarationArgsSchema = z.strictObject({
  vatPeriodId: RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema.shape.id,
});

/**
 * Tax Calculation Slot Item
 * EN: Represents a taxable base and its calculated tax, e.g. Box 382/383 (Acquisition Tax)
 * FR: Représente une base imposable et l'impôt calculé, p. ex. rubriques 382/383 (Impôt sur les acquisitions)
 * DE: Stellt eine Bemessungsgrundlage und die berechnete Steuer dar, z.B. Ziffer 382/383 (Bezugssteuer)
 */
export const VatRateTaxItemSchema = z.object({
  /**
   * EN: Taxable turnover base for this rate
   * FR: Chiffre d'affaires imposable pour ce taux
   * DE: Steuerbarer Umsatz für diesen Satz
   */
  taxableBase: z.bigint(),
  /**
   * EN: Calculated tax owed for this rate
   * FR: Impôt calculé pour ce taux
   * DE: Berechnete Steuer für diesen Satz
   */
  taxAmount: z.bigint(),
});

/**
 * Net Rate Tax Calculation Slot Item
 * EN: Represents a single tax rate entry under Box 322/332 (Pre-2024) or Box 323/333 (Post-2024)
 * FR: Représente une entrée de taux d'imposition sous les rubriques 322/332 (Avant 2024) ou 323/333 (Dès 2024)
 * DE: Stellt einen einzelnen Steuersatzeintrag unter Ziffer 322/332 (Vor 2024) oder 323/333 (Ab 2024) dar
 */
export const VatNetRateTaxItemSchema = VatRateTaxItemSchema.extend({
  /**
   * EN: Net Tax Rate (Saldosteuersatz) scaled token value
   * FR: Taux de dette fiscale nette (TDFN)
   * DE: Saldosteuersatz (SSS) Wert
   */
  rate: z.bigint(),
});

/**
 * Sales Tax Calculation Slot Item (Effective Method)
 * EN: Represents a single tax rate entry under Box 302/312/342 (Pre-2024) or Box 303/313/343 (Post-2024),
 *     the taxable base without VAT
 * FR: Représente une entrée de taux d'imposition sous les rubriques 302/312/342 (Avant 2024) ou 303/313/343
 *     (Dès 2024), la base imposable hors TVA
 * DE: Stellt einen einzelnen Steuersatzeintrag unter Ziffer 302/312/342 (Vor 2024) oder 303/313/343 (Ab 2024)
 *     dar, die Bemessungsgrundlage ohne MWST
 */
export const VatSalesTaxItemSchema = VatRateTaxItemSchema.extend({
  /**
   * EN: Tax rate scaled token value
   * FR: Taux d'imposition
   * DE: Steuersatz
   */
  rate: z.bigint(),
});

/**
 * Swiss VAT Declaration Result Schema (ESTV, effective and Net Tax Rate / Saldosteuersatz methods)
 * EN: Full result object schema matching the ESTV Form 101 breakdown.
 * FR: Schéma complet correspondant au décompte AFC Formulaire 101.
 * DE: Vollständiges Ergebnis-Schema entsprechend dem ESTV Formular 101.
 */
export const VatDeclarationResultSchema = z.object({
  // --- SECTION I: TURNOVER & DEDUCTIONS / CHIFFRE D'AFFAIRES ET DÉDUCTIONS / UMSATZ & ABZÜGE ---
  /**
   * Box 200
   * EN: Total gross turnover
   * FR: Chiffre d'affaires total
   * DE: Total der vereinbarten oder vereinnahmten Entgelte
   */
  box200: z.bigint(),

  // TODO: box 205 not supported yet
  /**
   * Box 205
   * EN: Exempted turnover voluntarily opted for taxation
   * FR: Prestations exclues du champ de l'impôt pour lesquelles il a été opté
   * DE: Von der Steuer ausgenommene Umsätze, für die optiert wird
   */
  // box205: z.bigint(),

  /**
   * Box 220
   * EN: Tax-exempt turnover
   * FR: Prestations exonérées
   * DE: Von der Steuer befreite Umsätze
   */
  box220: z.bigint(),

  // TODO: box 221 not supported yet
  /**
   * Box 221
   * EN: Exports and foreign place of performance
   * FR: Prestations fournies à l'étranger
   * DE: Leistungen im Ausland
   */
  // box221: z.bigint(),

  /**
   * Box 225
   * EN: Transfers via notification procedure
   * FR: Transferts par la procédure de déclaration
   * DE: Übertragung im Meldeverfahren
   */
  box225: z.bigint(),

  // TODO: box 230 not supported yet
  /**
   * Box 230
   * EN: Out-of-scope turnover (not opted for)
   * FR: Prestations exclues du champ de l'impôt non optées
   * DE: Von der Steuer ausgenommene Umsätze ohne Option
   */
  // box230: z.bigint(),

  /**
   * Box 235
   * EN: Reductions of consideration (discounts, rebates, losses). Only the bad debts (invoices written off
   *     with the agreed method) are computed.
   * FR: Diminutions de la contre-prestation (escomptes, rabais, pertes). Seules les pertes sur débiteurs
   *     (factures irrécouvrables avec la méthode convenue) sont calculées.
   * DE: Entgeltsminderungen (Skonti, Rabatte, Verluste). Nur die Debitorenverluste (abgeschriebene
   *     Rechnungen mit vereinbarten Entgelten) werden berechnet.
   */
  box235: z.bigint(),

  // TODO: box 280 not supported yet
  /**
   * Box 280
   * EN: Miscellaneous deductions (e.g. land value)
   * FR: Divers (p. ex. valeur du terrain)
   * DE: Diverses (z.B. Wert des Bodens)
   */
  // box280: z.bigint(),

  /**
   * Box 289
   * EN: Total deductions (220 + 221 + 225 + 230 + 235 + 280)
   * FR: Total des déductions
   * DE: Total der Abzüge
   */
  box289: z.bigint(),

  /**
   * Box 299
   * EN: Taxable turnover base (200 - 289)
   * FR: Total du chiffre d'affaires imposable
   * DE: Steuerbarer Gesamtumsatz
   */
  box299: z.bigint(),

  // --- SECTION II: TAX CALCULATION / CALCUL DE L'IMPÔT / STEUERBERECHNUNG ---
  /**
   * Box 303 / 313 / 343
   * EN: Post-2024 sales tax calculations (effective method)
   * FR: Calculs de l'impôt sur le chiffre d'affaires dès 2024 (méthode effective)
   * DE: Steuerberechnung Umsatzsteuer ab 2024 (effektive Methode)
   */
  box303: z.array(VatSalesTaxItemSchema),

  /**
   * Box 302 / 312 / 342
   * EN: Pre-2024 sales tax calculations (effective method)
   * FR: Calculs de l'impôt sur le chiffre d'affaires avant 2024 (méthode effective)
   * DE: Steuerberechnung Umsatzsteuer bis 2023 (effektive Methode)
   */
  box302: z.array(VatSalesTaxItemSchema),

  /**
   * Box 323 / 333
   * EN: Post-2024 Net Rate tax calculations
   * FR: Calculs de taxe aux taux nets dès 2024
   * DE: Steuerberechnung Saldosteuersätze ab 2024
   */
  box323: z.array(VatNetRateTaxItemSchema),

  /**
   * Box 322 / 332
   * EN: Pre-2024 Net Rate tax calculations
   * FR: Calculs de taxe aux taux nets avant 2024
   * DE: Steuerberechnung Saldosteuersätze bis 2023
   */
  box322: z.array(VatNetRateTaxItemSchema),

  /**
   * Box 383
   * EN: Post-2024 Acquisition Tax (Bezugssteuer)
   * FR: Impôt sur les acquisitions dès 2024
   * DE: Bezugssteuer ab 2024
   */
  box383: VatRateTaxItemSchema,

  /**
   * Box 382
   * EN: Pre-2024 Acquisition Tax (Bezugssteuer)
   * FR: Impôt sur les acquisitions avant 2024
   * DE: Bezugssteuer bis 2023
   */
  box382: VatRateTaxItemSchema,

  /**
   * Box 399
   * EN: Subtotal tax liability (Net rates + Acquisition taxes)
   * FR: Total TVA due
   * DE: Total geschuldete MWST
   */
  box399: z.bigint(),

  // --- SECTION III: CORRECTIONS & TOTALS / CORRECTIONS ET TOTAUX / BERICHTIGUNGEN & TOTALS ---
  /**
   * Box 400
   * EN: Input tax on materials and services (effective method)
   * FR: Impôt préalable sur les coûts en matériel et en prestations de services (méthode effective)
   * DE: Vorsteuer auf Material- und Dienstleistungsaufwand (effektive Methode)
   */
  box400: z.bigint(),

  /**
   * Box 405
   * EN: Input tax on investments and other operating costs (effective method)
   * FR: Impôt préalable sur les investissements et autres charges d'exploitation (méthode effective)
   * DE: Vorsteuer auf Investitionen und übrigem Betriebsaufwand (effektive Methode)
   */
  box405: z.bigint(),

  /**
   * Box 415
   * EN: Input tax corrections: mixed use, own use
   * FR: Corrections de l'impôt préalable : double affectation, prestations à soi-même
   * DE: Vorsteuerkorrekturen: gemischte Verwendung, Eigenverbrauch
   */
  box415: z.bigint(),

  /**
   * Box 470
   * EN: Tax crediting according to Form No. 1050
   * FR: Mise en compte de l’impôt selon le formulaire n° 1050
   * DE: Anrechnung der Steuer gemäss Formular Nr. 1050
   */
  box470: z.bigint(),

  /**
   * Box 471
   * EN: Tax crediting according to Forms No. 1055, 1056
   * FR: Mise en compte de l’impôt selon les formulaires n° 1055, 1056
   * DE: Anrechnung der Steuer gemäss Formular Nr. 1055, 1056
   */
  box471: z.bigint(),

  /**
   * Box 479
   * EN: Deducted from the tax owed: total of boxes 400 to 420 (effective method) or 470 to 471 (net rate method)
   * FR: Total des chiffres 400 à 420 (méthode effective) ou 470 à 471 (taux de la dette fiscale nette)
   * DE: Total Ziffern 400 bis 420 (effektive Methode) oder 470 bis 471 (Saldosteuersatz)
   */
  box479: z.bigint(),

  /**
   * Box 500
   * EN: Final payable amount to ESTV (0 if in refund status)
   * FR: Montant à payer à l'AFC (0 si solde en votre faveur)
   * DE: Endgültig an die ESTV zu zahlender Betrag (0 bei Guthaben)
   */
  box500: z.bigint(),

  /**
   * Box 510
   * EN: Refund claim amount (if total liability < 0)
   * FR: Solde en faveur du contribuable
   * DE: Guthaben der steuerpflichtigen Person
   */
  box510: z.bigint(),

  // --- SECTION IV: INFORMATIONAL RECEIPTS / AUTRES FLUX DE FONDS / ANDERE MITTELFLÜSSE ---
  // TODO: box 900 not supported yet -  they would require their own VAT type
  /**
   * Box 900
   * EN: Subsidies and public contributions received
   * FR: Subventions et autres contributions publiques encaissées
   * DE: Subventionen und andere öffentlich-rechtliche Beiträge
   */
  // box900: z.bigint(),

  /**
   * Box 910
   * EN: Donations, dividends, and damage compensation
   * FR: Dons, dividendes, dédommagements
   * DE: Spenden, Dividenden, Schadenersatz
   */
  box910: z.bigint(),
});
