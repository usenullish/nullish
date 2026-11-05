import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { join } from "node:path";
import { convertStringToUlps } from "@usenullish/nullish-common";
import { parseCamt053 } from "../../../src/banking/_helpers/camt";
import { EngineError } from "../../../src/errors";

const IBAN = "CH3908704016075473007";

const parse = ({ xml }: { xml: string }) => parseCamt053({ file: new TextEncoder().encode(xml) });
const DEBTOR_IBAN = "CH9300762011623852957";
const QR_REFERENCE = "000000045662988604211317563";
const SHA_256 = /^[0-9a-f]{64}$/;

const balance = ({
  code,
  amount,
  indicator,
}: {
  code: string;
  amount: string;
  indicator: string;
}) => `
      <Bal>
        <Tp><CdOrPrtry><Cd>${code}</Cd></CdOrPrtry></Tp>
        <Amt Ccy="CHF">${amount}</Amt>
        <CdtDbtInd>${indicator}</CdtDbtInd>
        <Dt><Dt>2026-10-01</Dt></Dt>
      </Bal>`;

const qrPayment = `
      <Ntry>
        <Amt Ccy="CHF">1081.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-10-05</Dt></BookgDt>
        <ValDt><Dt>2026-10-06</Dt></ValDt>
        <AcctSvcrRef>20261005000123</AcctSvcrRef>
        <NtryDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>20261005000123-1</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">1081.00</Amt>
            <CdtDbtInd>CRDT</CdtDbtInd>
            <RltdPties>
              <Dbtr><Pty><Nm>Client SA</Nm></Pty></Dbtr>
              <DbtrAcct><Id><IBAN>${DEBTOR_IBAN}</IBAN></Id></DbtrAcct>
            </RltdPties>
            <RmtInf>
              <Ustrd>Invoice 34</Ustrd>
              <Strd>
                <CdtrRefInf>
                  <Tp><CdOrPrtry><Prtry>QRR</Prtry></CdOrPrtry></Tp>
                  <Ref>${QR_REFERENCE}</Ref>
                </CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>`;

const bankFee = `
      <Ntry>
        <Amt Ccy="CHF">15.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-10-31</Dt></BookgDt>
        <AcctSvcrRef>20261031000456</AcctSvcrRef>
      </Ntry>`;

const pendingEntry = `
      <Ntry>
        <Amt Ccy="CHF">50.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts><Cd>PDNG</Cd></Sts>
        <BookgDt><Dt>2026-10-31</Dt></BookgDt>
        <AcctSvcrRef>20261031000789</AcctSvcrRef>
      </Ntry>`;

const batch = `
      <Ntry>
        <Amt Ccy="CHF">300.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-10-10</Dt></BookgDt>
        <AcctSvcrRef>20261010000001</AcctSvcrRef>
        <NtryDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>20261010000001-1</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">100.00</Amt>
            <CdtDbtInd>CRDT</CdtDbtInd>
          </TxDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>20261010000001-2</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">200.00</Amt>
            <CdtDbtInd>CRDT</CdtDbtInd>
          </TxDtls>
        </NtryDtls>
      </Ntry>`;

const statement = ({
  entries = "",
  balances = balance({ code: "OPBD", amount: "5000.00", indicator: "CRDT" }) +
    balance({ code: "CLBD", amount: "6066.00", indicator: "CRDT" }),
  period = `<FrToDt><FrDtTm>2026-10-01T00:00:00</FrDtTm><ToDtTm>2026-10-31T23:59:59+01:00</ToDtTm></FrToDt>`,
  id = "STMT-20261031-0001",
}: {
  entries?: string;
  balances?: string;
  period?: string;
  id?: string;
} = {}) => `
    <Stmt>
      <Id>${id}</Id>
      ${period}
      <Acct><Id><IBAN>${IBAN}</IBAN></Id><Ccy>CHF</Ccy></Acct>
      ${balances}
      ${entries}
    </Stmt>`;

const camt053 = ({
  statements = statement({ entries: qrPayment + bankFee }),
  namespace = "urn:iso:std:iso:20022:tech:xsd:camt.053.001.08",
  prolog = `<?xml version="1.0" encoding="UTF-8"?>`,
}: { statements?: string; namespace?: string; prolog?: string } = {}) => `${prolog}
<Document xmlns="${namespace}">
  <BkToCstmrStmt>
    <GrpHdr><MsgId>MSG-20261031-0001</MsgId><CreDtTm>2026-10-31T23:00:00</CreDtTm></GrpHdr>
    ${statements}
  </BkToCstmrStmt>
</Document>`;

const expectError = (xml: string, message: string) => {
  const result = parse({ xml });

  expect(result.status).toBe("error");
  if (result.status !== "error") return;
  expect(result.err).toBeInstanceOf(EngineError);
  expect(result.err).toHaveProperty("message", expect.stringContaining(message));
};

describe("parseCamt053", () => {
  afterEach(() => {
    spyOn(console, "error").mockRestore();
  });

  test("reads the statement with its period, account and balances", () => {
    const result = parse({ xml: camt053() });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result).toHaveLength(1);
    const [parsed] = result.result;
    expect(parsed?.bankMessageId).toBe("MSG-20261031-0001");
    expect(parsed?.bankStatementId).toBe("STMT-20261031-0001");
    expect(parsed?.iban).toBe(IBAN);
    expect(parsed?.currency).toBe("CHF");
    expect(parsed?.startOn).toEqual(new Date("2026-10-01"));
    expect(parsed?.endOn).toEqual(new Date("2026-10-31"));
    expect(parsed?.openingBalance).toBe("5000.00");
    expect(parsed?.closingBalance).toBe("6066.00");
  });

  test("reads money in with its counterparty, creditor reference and communication", () => {
    const result = parse({ xml: camt053() });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result[0]?.movements[0]).toEqual({
      bankReference: "20261005000123-1",
      dedupeHash: expect.stringMatching(SHA_256),
      bookedOn: new Date("2026-10-05"),
      valueOn: new Date("2026-10-06"),
      amount: "1081.00",
      currency: "CHF",
      counterpartyName: "Client SA",
      counterpartyAddress: null,
      counterpartyIban: DEBTOR_IBAN,
      creditorReference: QR_REFERENCE,
      communication: "Invoice 34",
      description: null,
      foreignAmount: null,
      foreignCurrency: null,
      bankFeesAmount: null,
      bankFeesCurrency: null,
    });
  });

  const paymentFrom = (debtor: string) =>
    qrPayment.replace("<Dbtr><Pty><Nm>Client SA</Nm></Pty></Dbtr>", `<Dbtr>${debtor}</Dbtr>`);

  const counterpartyAddressOf = (debtor: string) => {
    const result = parse({
      xml: camt053({ statements: statement({ entries: paymentFrom(debtor) }) }),
    });

    expect(result.status).toBe("success");
    return result.status === "success"
      ? result.result[0]?.movements[0]?.counterpartyAddress
      : undefined;
  };

  test("reads the structured postal address of the counterparty", () => {
    expect(
      counterpartyAddressOf(`<Pty>
        <Nm>Client SA</Nm>
        <PstlAdr>
          <StrtNm>Rue du Lac</StrtNm>
          <BldgNb>2</BldgNb>
          <PstCd>1003</PstCd>
          <TwnNm>Lausanne</TwnNm>
          <Ctry>CH</Ctry>
        </PstlAdr>
      </Pty>`),
    ).toBe("Rue du Lac 2, 1003 Lausanne, CH");
  });

  test("reads the postal address lines of the counterparty", () => {
    expect(
      counterpartyAddressOf(`<Pty>
        <Nm>Client SA</Nm>
        <PstlAdr>
          <AdrLine>Rue du Lac 2</AdrLine>
          <AdrLine>1003 Lausanne</AdrLine>
        </PstlAdr>
      </Pty>`),
    ).toBe("Rue du Lac 2, 1003 Lausanne");
  });

  test("reads the postal address of a counterparty given without a party wrapper", () => {
    expect(
      counterpartyAddressOf(`
        <Nm>Client SA</Nm>
        <PstlAdr><AdrLine>1003 Lausanne</AdrLine></PstlAdr>`),
    ).toBe("1003 Lausanne");
  });

  test("reads no postal address for a counterparty without one", () => {
    expect(counterpartyAddressOf("<Pty><Nm>Client SA</Nm></Pty>")).toBeNull();
  });

  const paymentInForeignCurrency = ({
    amountDetails,
    bankFees = "",
  }: {
    amountDetails: string;
    bankFees?: string;
  }) =>
    qrPayment.replace(
      "<CdtDbtInd>CRDT</CdtDbtInd>\n            <RltdPties>",
      `<CdtDbtInd>CRDT</CdtDbtInd>${amountDetails}${bankFees}\n            <RltdPties>`,
    );

  const firstMovementOf = (entries: string) => {
    const result = parse({ xml: camt053({ statements: statement({ entries }) }) });

    expect(result.status).toBe("success");
    return result.status === "success" ? result.result[0]?.movements[0] : undefined;
  };

  test("reads the amount in another currency and the bank fees", () => {
    const movement = firstMovementOf(
      paymentInForeignCurrency({
        amountDetails: `<AmtDtls>
          <InstdAmt><Amt Ccy="EUR">1200.00</Amt></InstdAmt>
          <TxAmt>
            <Amt Ccy="EUR">1200.00</Amt>
            <CcyXchg><SrcCcy>EUR</SrcCcy><TrgtCcy>CHF</TrgtCcy><XchgRate>.9</XchgRate></CcyXchg>
          </TxAmt>
        </AmtDtls>`,
        bankFees: `<Chrgs><Rcrd><Amt Ccy="EUR">1.00</Amt><CdtDbtInd>CRDT</CdtDbtInd></Rcrd></Chrgs>`,
      }),
    );

    expect(movement).toMatchObject({
      amount: "1081.00",
      currency: "CHF",
      foreignAmount: "1200.00",
      foreignCurrency: "EUR",
      bankFeesAmount: "1.00",
      bankFeesCurrency: "EUR",
    });
  });

  test("reads the amount in another currency of money out as a negative amount", () => {
    const movement = firstMovementOf(
      bankFee.replace(
        "<AcctSvcrRef>20261031000456</AcctSvcrRef>",
        `<AcctSvcrRef>20261031000456</AcctSvcrRef>
        <AmtDtls><InstdAmt><Amt Ccy="EUR">16.50</Amt></InstdAmt></AmtDtls>`,
      ),
    );

    expect(movement).toMatchObject({
      amount: "-15.00",
      foreignAmount: "-16.50",
      foreignCurrency: "EUR",
    });
  });

  test("reads the counter value when the instructed amount is in the currency of the account", () => {
    const movement = firstMovementOf(
      paymentInForeignCurrency({
        amountDetails: `<AmtDtls>
          <InstdAmt><Amt Ccy="CHF">1081.00</Amt></InstdAmt>
          <CntrValAmt><Amt Ccy="USD">1300.00</Amt></CntrValAmt>
        </AmtDtls>`,
      }),
    );

    expect(movement).toMatchObject({
      foreignAmount: "1300.00",
      foreignCurrency: "USD",
    });
  });

  test("reads no amount in another currency when the details are in the currency of the account", () => {
    const movement = firstMovementOf(
      paymentInForeignCurrency({
        amountDetails: `<AmtDtls><InstdAmt><Amt Ccy="CHF">1081.00</Amt></InstdAmt></AmtDtls>`,
      }),
    );

    expect(movement).toMatchObject({ foreignAmount: null, foreignCurrency: null });
  });

  test("reads the total of the bank fees", () => {
    const movement = firstMovementOf(
      paymentInForeignCurrency({
        amountDetails: "",
        bankFees: `<Chrgs>
          <TtlChrgsAndTaxAmt Ccy="CHF">3.00</TtlChrgsAndTaxAmt>
          <Rcrd><Amt Ccy="CHF">1.00</Amt></Rcrd>
          <Rcrd><Amt Ccy="CHF">2.00</Amt></Rcrd>
        </Chrgs>`,
      }),
    );

    expect(movement).toMatchObject({ bankFeesAmount: "3.00", bankFeesCurrency: "CHF" });
  });

  test("reads no bank fees when several are given without a total", () => {
    const movement = firstMovementOf(
      paymentInForeignCurrency({
        amountDetails: "",
        bankFees: `<Chrgs>
          <Rcrd><Amt Ccy="CHF">1.00</Amt></Rcrd>
          <Rcrd><Amt Ccy="EUR">2.00</Amt></Rcrd>
        </Chrgs>`,
      }),
    );

    expect(movement).toMatchObject({ bankFeesAmount: null, bankFeesCurrency: null });
  });

  test("reads the bank fees given as amounts in version 04", () => {
    const movement = firstMovementOf(
      paymentInForeignCurrency({
        amountDetails: "",
        bankFees: `<Chrgs><Amt Ccy="CHF">2.50</Amt></Chrgs>`,
      }),
    );

    expect(movement).toMatchObject({ bankFeesAmount: "2.50", bankFeesCurrency: "CHF" });
  });

  test("gives the same dedupe hash whatever the amount in another currency", () => {
    const [plain] = parseMovements(qrPayment);
    const [foreign] = parseMovements(
      paymentInForeignCurrency({
        amountDetails: `<AmtDtls><InstdAmt><Amt Ccy="EUR">1200.00</Amt></InstdAmt></AmtDtls>`,
      }),
    );

    expect(foreign?.dedupeHash).toBe(plain?.dedupeHash);
  });

  test("collapses the line breaks and the indentation of the communication and the description", () => {
    const movement = firstMovementOf(
      qrPayment
        .replace(
          "<Ustrd>Invoice 34</Ustrd>",
          `<Ustrd>Invoice 34
                Thank you
            </Ustrd>`,
        )
        .replace(
          "</RmtInf>",
          `</RmtInf>
            <AddtlTxInf>
                Credit   from Client SA
            </AddtlTxInf>`,
        ),
    );

    expect(movement).toMatchObject({
      communication: "Invoice 34 Thank you",
      description: "Credit from Client SA",
    });
  });

  test("reads money out as a negative amount from an entry without details", () => {
    const result = parse({ xml: camt053() });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result[0]?.movements[1]).toEqual({
      bankReference: "20261031000456",
      dedupeHash: expect.stringMatching(SHA_256),
      bookedOn: new Date("2026-10-31"),
      valueOn: null,
      amount: "-15.00",
      currency: "CHF",
      counterpartyName: null,
      counterpartyAddress: null,
      counterpartyIban: null,
      creditorReference: null,
      communication: null,
      description: null,
      foreignAmount: null,
      foreignCurrency: null,
      bankFeesAmount: null,
      bankFeesCurrency: null,
    });
  });

  test("reads one movement per transaction detail of a batch", () => {
    const result = parse({ xml: camt053({ statements: statement({ entries: batch }) }) });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(
      result.result[0]?.movements.map(({ bankReference, amount }) => ({ bankReference, amount })),
    ).toEqual([
      { bankReference: "20261010000001-1", amount: "100.00" },
      { bankReference: "20261010000001-2", amount: "200.00" },
    ]);
  });

  test("skips the entries that are not booked", () => {
    const result = parse({
      xml: camt053({ statements: statement({ entries: bankFee + pendingEntry }) }),
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result[0]?.movements.map(({ bankReference }) => bankReference)).toEqual([
      "20261031000456",
    ]);
  });

  test("reads a negative closing balance", () => {
    const result = parse({
      xml: camt053({
        statements: statement({
          balances:
            balance({ code: "OPBD", amount: "10.00", indicator: "CRDT" }) +
            balance({ code: "CLBD", amount: "5.00", indicator: "DBIT" }),
        }),
      }),
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result[0]?.closingBalance).toBe("-5.00");
  });

  test("reads a statement without movements", () => {
    const result = parse({ xml: camt053({ statements: statement() }) });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result[0]?.movements).toEqual([]);
  });

  test("reads every statement of the file", () => {
    const result = parse({
      xml: camt053({
        statements: statement({ id: "STMT-1" }) + statement({ id: "STMT-2" }),
      }),
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.map(({ bankStatementId }) => bankStatementId)).toEqual([
      "STMT-1",
      "STMT-2",
    ]);
  });

  test("rejects a file that declares a document type", () => {
    expectError(
      camt053({ prolog: `<?xml version="1.0"?><!DOCTYPE Document [ <!ENTITY a "a"> ]>` }),
      "declares a document type",
    );
  });

  test("rejects a file that is not encoded in UTF-8", () => {
    const result = parseCamt053({ file: new Uint8Array([0x3c, 0xff, 0xfe, 0x3e]) });

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.err).toBeInstanceOf(EngineError);
    expect(result.err).toHaveProperty("message", expect.stringContaining("not encoded in UTF-8"));
  });

  test("rejects a file that is not well-formed XML", () => {
    expectError("<Document><BkToCstmrStmt>", "not well-formed XML");
  });

  test("rejects another camt version", () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    expectError(
      camt053({ namespace: "urn:iso:std:iso:20022:tech:xsd:camt.053.001.02" }),
      "is not a camt.053 bank statement (version 04 or 08)",
    );
    expect(consoleError).toHaveBeenCalled();
  });

  test("rejects a statement without opening balance", () => {
    expectError(
      camt053({
        statements: statement({
          balances: balance({ code: "CLBD", amount: "6066.00", indicator: "CRDT" }),
        }),
      }),
      "has no OPBD balance",
    );
  });

  test("rejects a statement without period", () => {
    expectError(camt053({ statements: statement({ period: "" }) }), "has no period");
  });

  const entryWithAmount = (amount: string) => `
      <Ntry>
        <Amt Ccy="CHF">${amount}</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-10-31</Dt></BookgDt>
        <AcctSvcrRef>20261031000999</AcctSvcrRef>
      </Ntry>`;

  test.each([
    [".03", "0.03"],
    ["+5.", "5"],
    [" 12.50 ", "12.50"],
  ])('reads the amount "%s" written as an XML decimal as %s', (amount, expected) => {
    const result = parse({
      xml: camt053({ statements: statement({ entries: entryWithAmount(amount) }) }),
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result[0]?.movements.map(({ amount: value }) => value)).toEqual([expected]);
  });

  test("rejects an amount with a thousands separator", () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    expectError(
      camt053({ statements: statement({ entries: entryWithAmount("1'000.00") }) }),
      "is not a camt.053 bank statement",
    );
    expect(consoleError).toHaveBeenCalled();
  });

  const feeWithoutReference = bankFee.replace(/<AcctSvcrRef>.*<\/AcctSvcrRef>/, "");

  const parseMovements = (entries: string) => {
    const result = parse({ xml: camt053({ statements: statement({ entries }) }) });

    expect(result.status).toBe("success");
    return result.status === "success" ? (result.result[0]?.movements ?? []) : [];
  };

  test("reads a movement without bank reference", () => {
    const [movement] = parseMovements(feeWithoutReference);

    expect(movement?.bankReference).toBeNull();
    expect(movement?.dedupeHash).toMatch(SHA_256);
  });

  test("gives a movement the same dedupe hash each time the file is read", () => {
    const first = parseMovements(qrPayment + feeWithoutReference);
    const second = parseMovements(qrPayment + feeWithoutReference);

    expect(second.map(({ dedupeHash }) => dedupeHash)).toEqual(
      first.map(({ dedupeHash }) => dedupeHash),
    );
  });

  test("gives the same dedupe hash to a movement of two statements", () => {
    const [alone] = parseMovements(feeWithoutReference);
    const [, withOthers] = parseMovements(qrPayment + feeWithoutReference);

    expect(withOthers?.dedupeHash).toBe(alone?.dedupeHash);
  });

  test("gives identical movements of a statement different dedupe hashes", () => {
    const movements = parseMovements(feeWithoutReference + feeWithoutReference);

    expect(new Set(movements.map(({ dedupeHash }) => dedupeHash)).size).toBe(2);
  });

  test("gives the same dedupe hash to an amount written 9, 9.0 or 9.00", () => {
    const hashes = ["9", "9.0", "9.00"].map(
      (amount) => parseMovements(entryWithAmount(amount))[0]?.dedupeHash,
    );

    expect(new Set(hashes).size).toBe(1);
  });

  test("gives a known movement its known dedupe hash", () => {
    const [fee] = parseMovements(bankFee);

    expect(fee?.dedupeHash).toBe(
      "6479879b3a9c814e06ce3e4db17ecc1e57493a74ba6afef7b2faabcce5489fa1",
    );
  });

  test("gives movements that differ by a field different dedupe hashes", () => {
    const [fee] = parseMovements(feeWithoutReference);
    const [otherFee] = parseMovements(feeWithoutReference.replaceAll("15.00", "16.00"));

    expect(otherFee?.dedupeHash).not.toBe(fee?.dedupeHash);
  });
});

describe("parseCamt053 with the UBS sample", () => {
  const readSample = (): Promise<Uint8Array> =>
    Bun.file(join(import.meta.dir, "../../../fixtures/ubs-camt-053.xml")).bytes();

  const toUlps = (amount: string): bigint => {
    const ulps = convertStringToUlps({ amount, decimals: 2 });

    if (typeof ulps !== "bigint") {
      throw new Error(`Invalid amount ${amount}`);
    }

    return ulps;
  };

  test("reads the statement inside the SWIFT envelope", async () => {
    const result = parseCamt053({ file: await readSample() });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result).toHaveLength(1);
    const [statement] = result.result;
    expect(statement?.bankMessageId).toBe("A59CD36X62RSZ66A");
    expect(statement?.bankStatementId).toBe("A59CD36X62RSZ66A");
    expect(statement?.iban).toBe("CH710023023099999999R");
    expect(statement?.currency).toBe("CHF");
    expect(statement?.startOn).toEqual(new Date("2024-09-03"));
    expect(statement?.endOn).toEqual(new Date("2024-09-03"));
    expect(statement?.openingBalance).toBe("-131995223.6");
    expect(statement?.closingBalance).toBe("-131995222.27");
    expect(statement?.movements).toHaveLength(15);
  });

  test("reads a movement with its counterparty and the bank's description", async () => {
    const result = parseCamt053({ file: await readSample() });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result[0]?.movements[0]).toEqual({
      bankReference: "ZD81239ZD6409375",
      dedupeHash: expect.stringMatching(SHA_256),
      bookedOn: new Date("2024-09-03"),
      valueOn: new Date("2024-09-03"),
      amount: "120",
      currency: "CHF",
      counterpartyName: "DUMMY DEBTOR",
      counterpartyAddress: "SOMEWHERE STREET, SOMEWHERE TOWN",
      counterpartyIban: null,
      creditorReference: null,
      communication: null,
      description: "Payment // ZD81239ZD6409375 // DUMMY DEBTOR",
      foreignAmount: null,
      foreignCurrency: null,
      bankFeesAmount: null,
      bankFeesCurrency: null,
    });
  });

  test("reads movements that add up from the opening to the closing balance", async () => {
    const result = parseCamt053({ file: await readSample() });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const [statement] = result.result;
    if (statement === undefined) return;

    const movements = statement.movements.reduce((sum, { amount }) => sum + toUlps(amount), 0n);

    expect(toUlps(statement.openingBalance) + movements).toBe(toUlps(statement.closingBalance));
  });
});

describe("parseCamt053 with a camt.053.001.04", () => {
  const readFixture = async (name: string) =>
    parseCamt053({
      file: await Bun.file(join(import.meta.dir, `../../../fixtures/${name}`)).bytes(),
    });

  test("reads the same statement as its camt.053.001.08 counterpart", async () => {
    const v04 = await readFixture("qr-camt-053-v04.xml");
    const v08 = await readFixture("qr-camt-053.xml");

    expect(v04.status).toBe("success");
    expect(v04).toEqual(v08);
  });

  test("reads the name of a counterparty given without a party wrapper", async () => {
    const result = await readFixture("qr-camt-053-v04.xml");

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const [statement] = result.result;
    expect(statement?.movements.map(({ counterpartyName }) => counterpartyName)).toContain(
      "Test Client SA",
    );
  });

  test("skips the entries whose status given directly is not booked", async () => {
    const result = await readFixture("qr-camt-053-v04.xml");

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const [statement] = result.result;
    expect(statement?.movements).toHaveLength(4);
  });
});
