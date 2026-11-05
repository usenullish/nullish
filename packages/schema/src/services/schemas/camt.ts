import * as z from "zod";
import { DateStringCodec, nonNullish } from "@usenullish/nullish-common";
import { RecordsSchema } from "../../records";
import { IbanSchema } from "../../records/schemas/_iban";

const oneOrMany = <T extends z.ZodType>(schema: T) =>
  z
    .union([schema, z.array(schema)])
    .transform((value): z.output<T>[] => (Array.isArray(value) ? value : [value]));

const XmlCurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);

// Amounts are XML decimals, which may be surrounded by spaces, carry a "+" sign and omit the digits
// before or after the dot (".03", "5."). They are normalized to e.g. "0.03" and "5".
const XmlDecimalSchema = z
  .string()
  .transform((value) => value.trim().replace(/^\+/, "").replace(/^\./, "0.").replace(/\.$/, ""))
  .pipe(z.string().regex(/^\d+(\.\d+)?$/));

const XmlAmountSchema = z.object({
  "@Ccy": XmlCurrencyCodeSchema,
  "#text": XmlDecimalSchema,
});

const XmlCreditDebitIndicatorSchema = z.enum(["CRDT", "DBIT"]);

const XmlAmountDetailsSchema = z.object({
  InstdAmt: z.object({ Amt: XmlAmountSchema }).optional(),
  TxAmt: z.object({ Amt: XmlAmountSchema }).optional(),
  CntrValAmt: z.object({ Amt: XmlAmountSchema }).optional(),
});

// Version 08 gives a total and records, version 04 repeats <Chrgs> with an amount each. Both become
// the list of the amounts given, the total first.
const XmlChargesSchema = oneOrMany(
  z.object({
    TtlChrgsAndTaxAmt: XmlAmountSchema.optional(),
    Rcrd: oneOrMany(z.object({ Amt: XmlAmountSchema })).optional(),
    Amt: XmlAmountSchema.optional(),
  }),
).transform((charges) =>
  charges.flatMap(({ TtlChrgsAndTaxAmt, Rcrd, Amt }) =>
    nonNullish(TtlChrgsAndTaxAmt)
      ? [TtlChrgsAndTaxAmt]
      : [...(Rcrd ?? []).map((record) => record.Amt), ...(nonNullish(Amt) ? [Amt] : [])],
  ),
);

const XmlDateSchema = z
  .union([
    z.object({ Dt: z.iso.date() }),
    z.object({ DtTm: z.iso.datetime({ offset: true, local: true }) }),
  ])
  .transform((value) => ("Dt" in value ? value.Dt : value.DtTm.slice(0, 10)))
  .pipe(DateStringCodec);

const XmlDateTimeSchema = z.iso
  .datetime({ offset: true, local: true })
  .transform((value) => value.slice(0, 10))
  .pipe(DateStringCodec);

// A postal address is given either as free lines (AdrLine) or as structured fields.
const XmlPostalAddressSchema = z.object({
  StrtNm: z.string().optional(),
  BldgNb: z.string().optional(),
  PstCd: z.string().optional(),
  TwnNm: z.string().optional(),
  Ctry: z.string().optional(),
  AdrLine: oneOrMany(z.string()).optional(),
});

const XmlPartyDetailsSchema = z.object({
  Nm: z.string().optional(),
  PstlAdr: XmlPostalAddressSchema.optional(),
});

// Version 04 names the party directly, version 08 wraps it in a <Pty>.
const XmlPartySchema = XmlPartyDetailsSchema.extend({
  Pty: XmlPartyDetailsSchema.optional(),
}).transform(({ Nm, PstlAdr, Pty }) => ({
  Nm: Pty?.Nm ?? Nm,
  PstlAdr: Pty?.PstlAdr ?? PstlAdr,
}));

// Version 04 gives the status code directly, version 08 wraps it in a <Cd>.
const XmlEntryStatusSchema = z
  .union([z.string(), z.object({ Cd: z.string() })])
  .transform((value) => (typeof value === "string" ? value : value.Cd));

const XmlPartyAccountSchema = z.object({
  Id: z.object({ IBAN: z.string().optional() }).optional(),
});

const XmlTransactionDetailsSchema = z.object({
  Refs: z.object({ AcctSvcrRef: z.string().optional() }).optional(),
  Amt: XmlAmountSchema.optional(),
  CdtDbtInd: XmlCreditDebitIndicatorSchema.optional(),
  AmtDtls: XmlAmountDetailsSchema.optional(),
  Chrgs: XmlChargesSchema.optional(),
  RltdPties: z
    .object({
      Dbtr: XmlPartySchema.optional(),
      DbtrAcct: XmlPartyAccountSchema.optional(),
      Cdtr: XmlPartySchema.optional(),
      CdtrAcct: XmlPartyAccountSchema.optional(),
    })
    .optional(),
  RmtInf: z
    .object({
      Ustrd: oneOrMany(z.string()).optional(),
      Strd: oneOrMany(
        z.object({ CdtrRefInf: z.object({ Ref: z.string().optional() }).optional() }),
      ).optional(),
    })
    .optional(),
  AddtlTxInf: z.string().optional(),
});

const XmlEntrySchema = z.object({
  Amt: XmlAmountSchema,
  CdtDbtInd: XmlCreditDebitIndicatorSchema,
  Sts: XmlEntryStatusSchema,
  BookgDt: XmlDateSchema,
  ValDt: XmlDateSchema.optional(),
  AcctSvcrRef: z.string().optional(),
  AmtDtls: XmlAmountDetailsSchema.optional(),
  Chrgs: XmlChargesSchema.optional(),
  NtryDtls: oneOrMany(
    z.object({ TxDtls: oneOrMany(XmlTransactionDetailsSchema).optional() }),
  ).optional(),
  AddtlNtryInf: z.string().optional(),
});

const XmlBalanceSchema = z.object({
  Tp: z.object({ CdOrPrtry: z.object({ Cd: z.string().optional() }) }),
  Amt: XmlAmountSchema,
  CdtDbtInd: XmlCreditDebitIndicatorSchema,
});

const XmlStatementSchema = z.object({
  Id: z.string(),
  FrToDt: z.object({ FrDtTm: XmlDateTimeSchema, ToDtTm: XmlDateTimeSchema }).optional(),
  Acct: z.object({ Id: z.object({ IBAN: IbanSchema }), Ccy: XmlCurrencyCodeSchema.optional() }),
  Bal: oneOrMany(XmlBalanceSchema),
  Ntry: oneOrMany(XmlEntrySchema).optional(),
});

// Positive means money came into the account, negative means it left.

const SignedDecimalSchema = z.string().regex(/^-?\d+(\.\d+)?$/);

const DecimalSchema = z.string().regex(/^\d+(\.\d+)?$/);

export const CamtMovementSchema = RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema.pick({
  bankReference: true,
  dedupeHash: true,
  bookedOn: true,
  valueOn: true,
  currency: true,
  counterpartyName: true,
  counterpartyAddress: true,
  counterpartyIban: true,
  creditorReference: true,
  communication: true,
  description: true,
  foreignCurrency: true,
  bankFeesCurrency: true,
}).extend({
  amount: SignedDecimalSchema,
  foreignAmount: SignedDecimalSchema.nullable(),
  bankFeesAmount: DecimalSchema.nullable(),
});

// The content of a movement that identifies it across imports, encoded so that the same movement
// always gives the same text: dates as YYYY-MM-DD and amounts in their shortest form ("9.00" is "9").
const ShortestDecimalCodec = z.codec(SignedDecimalSchema, SignedDecimalSchema, {
  decode: (value) => value,
  encode: (value) => (value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value),
});

// The amounts in other currencies are kept for information only, they do not identify a movement.
export const CamtMovementContentSchema = CamtMovementSchema.omit({
  dedupeHash: true,
  foreignAmount: true,
  foreignCurrency: true,
  bankFeesAmount: true,
  bankFeesCurrency: true,
}).extend({
  bookedOn: DateStringCodec,
  valueOn: DateStringCodec.nullable(),
  amount: ShortestDecimalCodec,
});

export const CamtMovementDedupeSchema = z.strictObject({
  movement: CamtMovementContentSchema,
  occurrence: z.number().int().positive(),
});

export const CamtStatementSchema =
  RecordsSchema.Banking.StatementsSchema.SelectStatementsSchema.pick({
    bankMessageId: true,
    bankStatementId: true,
    startOn: true,
    endOn: true,
    currency: true,
  }).extend({
    iban: IbanSchema,
    openingBalance: SignedDecimalSchema,
    closingBalance: SignedDecimalSchema,
    movements: z.array(CamtMovementSchema),
  });

const CAMT_053_NAMESPACES = [
  "urn:iso:std:iso:20022:tech:xsd:camt.053.001.04",
  "urn:iso:std:iso:20022:tech:xsd:camt.053.001.08",
] as const;

const XmlDocumentSchema = z.object({
  "@xmlns": z.enum(CAMT_053_NAMESPACES),
  BkToCstmrStmt: z.object({
    GrpHdr: z.object({ MsgId: z.string() }),
    Stmt: oneOrMany(XmlStatementSchema),
  }),
});

export const Camt053DocumentSchema = z
  .union([
    z.object({ Document: XmlDocumentSchema }),
    z.object({ Envelope: z.object({ Document: XmlDocumentSchema }) }),
  ])
  .transform((value) => ("Envelope" in value ? value.Envelope.Document : value.Document));
