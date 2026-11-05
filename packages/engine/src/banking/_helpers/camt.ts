import { CryptoHasher as BunCryptoHasher, XML as BunXML } from "bun";
import {
  isEmptyString,
  isNullish,
  nonNullish,
  type Result,
  jsonSortedReplacer,
  tryCatchSync,
  type Option,
  type Nullable,
} from "@usenullish/nullish-common";
import { type Services, ServicesSchema } from "@usenullish/nullish-schema/services";
import { EngineError } from "../../errors";
import * as z from "zod";

type CamtDocument = Services["Camt"]["Document"];
type CamtStatement = Services["Camt"]["Statement"];
type CamtMovement = Services["Camt"]["Movement"];
type CamtMovementDedupe = Services["Camt"]["MovementDedupe"];
type ParsedMovement = Omit<CamtMovement, "dedupeHash">;

type XmlStatement = CamtDocument["BkToCstmrStmt"]["Stmt"][number];
type XmlEntry = NonNullable<XmlStatement["Ntry"]>[number];
type XmlTransactionDetails = NonNullable<
  NonNullable<XmlEntry["NtryDtls"]>[number]["TxDtls"]
>[number];
type XmlAmount = XmlEntry["Amt"];
type XmlPostalAddress = NonNullable<
  NonNullable<NonNullable<XmlTransactionDetails["RltdPties"]>["Dbtr"]>["PstlAdr"]
>;
type XmlAmountDetails = NonNullable<XmlEntry["AmtDtls"]>;
type XmlCharges = NonNullable<XmlEntry["Chrgs"]>;
type XmlBalance = XmlStatement["Bal"][number];
type XmlCreditDebitIndicator = XmlEntry["CdtDbtInd"];

// ┌────────┬────────────────────────────────────────────────────────────────────────────────┐
// │ Status │                                    Meaning                                     │
// ├────────┼────────────────────────────────────────────────────────────────────────────────┤
// │ BOOK   │ booked: the money has actually moved, and it's counted in the balances         │
// ├────────┼────────────────────────────────────────────────────────────────────────────────┤
// │ PDNG   │ pending: announced but not booked yet, and it may still change or be cancelled │
// ├────────┼────────────────────────────────────────────────────────────────────────────────┤
// │ INFO   │ information only, no money movement                                            │
// └────────┴────────────────────────────────────────────────────────────────────────────────┘
const BOOKED_ENTRY_STATUS = "BOOK";

const OPENING_BALANCE_CODE = "OPBD";
const CLOSING_BALANCE_CODE = "CLBD";

class CamtInvalidError extends EngineError {}

const collapseWhitespace = (text: Option<string>): Option<string> =>
  text?.replace(/\s+/g, " ").trim();

const signedAmount = ({
  amount,
  indicator,
}: {
  amount: XmlAmount;
  indicator: XmlCreditDebitIndicator;
}): string => (indicator === "DBIT" ? `-${amount["#text"]}` : amount["#text"]);

const joinParts = ({
  parts,
  separator,
}: {
  parts: Option<string>[];
  separator: string;
}): Option<string> => {
  const joined = parts
    .map((part) => part?.trim())
    .filter((part) => !isEmptyString(part))
    .join(separator);

  return isEmptyString(joined) ? undefined : joined;
};

const parsePostalAddress = (address: XmlPostalAddress): Nullable<string> => {
  const { StrtNm, BldgNb, PstCd, TwnNm, Ctry, AdrLine } = address;

  const structured = joinParts({
    parts: [
      joinParts({ parts: [StrtNm, BldgNb], separator: " " }),
      joinParts({ parts: [PstCd, TwnNm], separator: " " }),
      Ctry,
    ],
    separator: ", ",
  });

  return structured ?? joinParts({ parts: AdrLine ?? [], separator: ", " }) ?? null;
};

const parseForeignAmount = ({
  amountDetails,
  currency,
  indicator,
}: {
  amountDetails: XmlAmountDetails | undefined;
  currency: string;
  indicator: XmlCreditDebitIndicator;
}): Pick<ParsedMovement, "foreignAmount" | "foreignCurrency"> => {
  const amounts = [amountDetails?.InstdAmt, amountDetails?.TxAmt, amountDetails?.CntrValAmt].filter(
    nonNullish,
  );

  const foreign = amounts.find(({ Amt }) => Amt["@Ccy"] !== currency);

  return {
    foreignAmount: isNullish(foreign) ? null : signedAmount({ amount: foreign.Amt, indicator }),
    foreignCurrency: foreign?.Amt["@Ccy"] ?? null,
  };
};

const parseBankFees = (
  charges: XmlCharges | undefined,
): Pick<ParsedMovement, "bankFeesAmount" | "bankFeesCurrency"> => {
  const [charge, ...others] = charges ?? [];

  if (isNullish(charge) || others.length > 0) {
    return { bankFeesAmount: null, bankFeesCurrency: null };
  }

  return { bankFeesAmount: charge["#text"], bankFeesCurrency: charge["@Ccy"] };
};

const parseMovement = ({
  entry,
  details,
  single,
  statementId,
}: {
  entry: XmlEntry;
  details: Option<XmlTransactionDetails>;
  single: boolean;
  statementId: string;
}): ParsedMovement => {
  const bankReference = details?.Refs?.AcctSvcrRef ?? (single ? entry.AcctSvcrRef : undefined);

  const amount = details?.Amt ?? (single ? entry.Amt : undefined);

  if (isNullish(amount)) {
    throw new CamtInvalidError(`A movement of statement ${statementId} has no amount (Amt)`);
  }

  const indicator = details?.CdtDbtInd ?? entry.CdtDbtInd;
  const parties = details?.RltdPties;
  const counterparty = indicator === "CRDT" ? parties?.Dbtr : parties?.Cdtr;
  const counterpartyAccount = indicator === "CRDT" ? parties?.DbtrAcct : parties?.CdtrAcct;
  const communication = collapseWhitespace(details?.RmtInf?.Ustrd?.join(" "));
  const description = collapseWhitespace(details?.AddtlTxInf ?? entry.AddtlNtryInf);
  const amountDetails = details?.AmtDtls ?? (single ? entry.AmtDtls : undefined);
  const charges = details?.Chrgs ?? (single ? entry.Chrgs : undefined);

  return {
    bankReference: bankReference ?? null,
    bookedOn: entry.BookgDt,
    valueOn: entry.ValDt ?? null,
    amount: signedAmount({ amount, indicator }),
    currency: amount["@Ccy"],
    counterpartyName: counterparty?.Nm ?? null,
    counterpartyAddress: isNullish(counterparty?.PstlAdr)
      ? null
      : parsePostalAddress(counterparty.PstlAdr),
    counterpartyIban: counterpartyAccount?.Id?.IBAN ?? null,
    creditorReference:
      details?.RmtInf?.Strd?.find(({ CdtrRefInf }) => CdtrRefInf?.Ref !== undefined)?.CdtrRefInf
        ?.Ref ?? null,
    communication: isEmptyString(communication) ? null : communication,
    description: isEmptyString(description) ? null : description,
    ...parseForeignAmount({ amountDetails, currency: amount["@Ccy"], indicator }),
    ...parseBankFees(charges),
  };
};

const parseEntry = ({
  entry,
  statementId,
}: {
  entry: XmlEntry;
  statementId: string;
}): ParsedMovement[] => {
  const details = (entry.NtryDtls ?? []).flatMap(({ TxDtls }) => TxDtls ?? []);

  if (details.length === 0) {
    return [parseMovement({ entry, details: undefined, single: true, statementId })];
  }

  return details.map((transaction) =>
    parseMovement({ entry, details: transaction, single: details.length === 1, statementId }),
  );
};

const findBalance = ({
  statement,
  code,
}: {
  statement: XmlStatement;
  code: string;
}): XmlBalance => {
  const balance = statement.Bal.find(({ Tp }) => Tp.CdOrPrtry.Cd === code);

  if (isNullish(balance)) {
    throw new CamtInvalidError(`Statement ${statement.Id} has no ${code} balance`);
  }

  return balance;
};

const parseStatement = ({
  statement,
  bankMessageId,
}: {
  statement: XmlStatement;
  bankMessageId: string;
}): CamtStatement => {
  const openingBalance = findBalance({ statement, code: OPENING_BALANCE_CODE });
  const closingBalance = findBalance({ statement, code: CLOSING_BALANCE_CODE });

  if (isNullish(statement.FrToDt)) {
    throw new CamtInvalidError(`Statement ${statement.Id} has no period (FrToDt)`);
  }

  return {
    bankMessageId,
    bankStatementId: statement.Id,
    iban: statement.Acct.Id.IBAN,
    currency: statement.Acct.Ccy ?? openingBalance.Amt["@Ccy"],
    startOn: statement.FrToDt.FrDtTm,
    endOn: statement.FrToDt.ToDtTm,
    openingBalance: signedAmount({
      amount: openingBalance.Amt,
      indicator: openingBalance.CdtDbtInd,
    }),
    closingBalance: signedAmount({
      amount: closingBalance.Amt,
      indicator: closingBalance.CdtDbtInd,
    }),
    movements: withDedupeHashes({
      movements: (statement.Ntry ?? [])
        .filter(({ Sts }) => Sts === BOOKED_ENTRY_STATUS)
        .flatMap((entry) => parseEntry({ entry, statementId: statement.Id })),
    }),
  };
};

const withDedupeHashes = ({ movements }: { movements: ParsedMovement[] }): CamtMovement[] => {
  const occurrences = new Map<string, number>();

  return movements.map((movement) => {
    const content = z.encode(ServicesSchema.CamtSchema.CamtMovementContentSchema, movement);
    const key = JSON.stringify(content, jsonSortedReplacer);

    // Two movements can be exactly the same, e.g. two identical fees on the same day without bank
    // reference. Counting them in the order of the statement (1, 2, …) keeps their hashes apart,
    // while giving each one the same hash every time the statement is imported again.
    const occurrence = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, occurrence);

    const dedupe: CamtMovementDedupe = { movement: content, occurrence };

    return {
      ...movement,
      dedupeHash: new BunCryptoHasher("sha256")
        .update(JSON.stringify(dedupe, jsonSortedReplacer))
        .digest("hex"),
    };
  });
};

// Bank statements never contain a <!DOCTYPE>. We refuse any file that has one, because it is the way
// a malicious file would try to read files from the server or make the parser run out of memory.
const DOCUMENT_TYPE_DECLARATION = /<!DOCTYPE/i;

export const parseCamt053 = ({ file }: { file: Uint8Array }): Result<CamtStatement[]> => {
  const decoded = tryCatchSync(() => new TextDecoder("utf-8", { fatal: true }).decode(file));

  if (decoded.status === "error") {
    return { status: "error", err: new CamtInvalidError("The file is not encoded in UTF-8") };
  }

  const { result: xml } = decoded;

  if (DOCUMENT_TYPE_DECLARATION.test(xml)) {
    return {
      status: "error",
      err: new CamtInvalidError("The file declares a document type, which a camt.053 never does"),
    };
  }

  const parsed = tryCatchSync(() => BunXML.parse(xml));

  if (parsed.status === "error") {
    return { status: "error", err: new CamtInvalidError("The file is not well-formed XML") };
  }

  const document = ServicesSchema.CamtSchema.Camt053DocumentSchema.safeParse(parsed.result);

  if (!document.success) {
    console.error(document.error);
    return {
      status: "error",
      err: new CamtInvalidError(
        `The file is not a camt.053 bank statement (version 04 or 08): ${z.prettifyError(document.error)}`,
      ),
    };
  }

  const {
    data: {
      BkToCstmrStmt: {
        GrpHdr: { MsgId: bankMessageId },
        Stmt: statements,
      },
    },
  } = document;

  return tryCatchSync(() =>
    statements.map((statement) =>
      ServicesSchema.CamtSchema.CamtStatementSchema.parse(
        parseStatement({ statement, bankMessageId }),
      ),
    ),
  );
};
