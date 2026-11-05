import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { join } from "node:path";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { ImportStatementsService } from "../../../src/banking/services/statements.import";
import { EngineError } from "../../../src/errors";
import {
  createBankRelation,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const statements = DbSchema.Banking.Statements.StatementsSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;

const UBS_IBAN = "CH710023023099999999R";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const readSample = async (): Promise<string> =>
  Bun.file(join(import.meta.dir, "../../../fixtures/ubs-camt-053.xml")).text();

const encode = (xml: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(xml);

describe("ImportStatementsService", () => {
  let sample: string;
  let organizationId: string;
  let bankRelationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    sample = await readSample();
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId, { iban: UBS_IBAN });
  });

  afterEach(() => {
    spyOn(console, "error").mockRestore();
  });

  const importFile = ({ xml, accountId = bankRelationId }: { xml: string; accountId?: string }) =>
    ImportStatementsService.create({ db, userId: TEST_USER_ID, bankRelationId: accountId }).import({
      file: encode(xml),
    });

  const expectEngineError = async ({ xml, message }: { xml: string; message: string }) => {
    const result = await importFile({ xml });

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.err).toBeInstanceOf(EngineError);
    expect(result.err).toHaveProperty("message", expect.stringContaining(message));
  };

  test("imports the statement and its movements", async () => {
    const result = await importFile({ xml: sample });

    expect(result).toEqual({
      status: "success",
      result: {
        statements: { processed: 1, ignored: 0 },
        movements: { inserted: 15, existing: 0 },
      },
    });

    const [statement] = await db
      .select()
      .from(statements)
      .where(eq(statements.bankRelationId, bankRelationId));
    expect(statement?.openingBalance).toBe(-13199522360n);
    expect(statement?.closingBalance).toBe(-13199522227n);

    const rows = await db
      .select()
      .from(movements)
      .where(eq(movements.bankRelationId, bankRelationId));
    expect(rows).toHaveLength(15);
    expect(rows.find(({ bankReference }) => bankReference === "ZD81239ZD6409375")?.amount).toBe(
      12000n,
    );
  });

  test("imports the statement of the IBAN of a bank relation with an invoice IBAN", async () => {
    const otherOrganizationId = await createOrganization(db, TEST_USER_ID);
    const withInvoiceIbanId = await createBankRelation(db, otherOrganizationId, {
      iban: UBS_IBAN,
      invoiceIban: "CH4431999123000889012",
    });

    const result = await importFile({ xml: sample, accountId: withInvoiceIbanId });

    expect(result.status).toBe("success");
  });

  const importWithInstructedAmount = async (instructedAmount: string) => {
    await importFile({
      xml: sample.replace(
        /<InstdAmt>\s*<Amt Ccy="CHF">120<\/Amt>/g,
        `<InstdAmt>${instructedAmount}`,
      ),
    });

    const [movement] = await db
      .select()
      .from(movements)
      .where(
        and(
          eq(movements.bankRelationId, bankRelationId),
          eq(movements.bankReference, "ZD81239ZD6409375"),
        ),
      );

    return movement;
  };

  test("imports the amount in another currency in its smallest unit", async () => {
    const movement = await importWithInstructedAmount('<Amt Ccy="EUR">130.5</Amt>');

    expect(movement?.amount).toBe(12000n);
    expect(movement?.foreignAmount).toBe(13050n);
    expect(movement?.foreignCurrency).toBe("EUR");
  });

  test("imports no amount in another currency of an unknown currency", async () => {
    const movement = await importWithInstructedAmount('<Amt Ccy="XYZ">130.5</Amt>');

    expect(movement?.amount).toBe(12000n);
    expect(movement?.foreignAmount).toBeNull();
    expect(movement?.foreignCurrency).toBeNull();
  });

  test("ignores the statement when the file is imported again", async () => {
    await importFile({ xml: sample });

    const result = await importFile({ xml: sample });

    expect(result).toEqual({
      status: "success",
      result: {
        statements: { processed: 0, ignored: 1 },
        movements: { inserted: 0, existing: 0 },
      },
    });

    const rows = await db
      .select()
      .from(statements)
      .where(eq(statements.bankRelationId, bankRelationId));
    expect(rows).toHaveLength(1);
  });

  test("counts the movements already imported through another statement as existing", async () => {
    await importFile({ xml: sample });

    const result = await importFile({
      xml: sample.replace("<Id>A59CD36X62RSZ66A</Id>", "<Id>A59CD36X62RSZ66B</Id>"),
    });

    expect(result).toEqual({
      status: "success",
      result: {
        statements: { processed: 1, ignored: 0 },
        movements: { inserted: 0, existing: 15 },
      },
    });
  });

  test("rejects a statement of another account", async () => {
    const otherBankRelationId = await createBankRelation(db, organizationId);

    const result = await importFile({ xml: sample, accountId: otherBankRelationId });

    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.err).toBeInstanceOf(EngineError);
    expect(result.err).toHaveProperty(
      "message",
      expect.stringContaining("not for this bank account"),
    );
  });

  test("rejects a statement whose movements do not reach the closing balance", async () => {
    await expectEngineError({
      xml: sample.replace(">131995222.27<", ">131995222.28<"),
      message: "does not add up",
    });
  });

  test("rejects an amount with more decimals than its currency", async () => {
    await expectEngineError({
      xml: sample.replace(">131995222.27<", ">131995222.275<"),
      message: "is not valid in CHF",
    });
  });

  test("rejects a file that is not a bank statement", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    await expectEngineError({ xml: "<Document/>", message: "is not a camt.053 bank statement" });
    expect(consoleError).toHaveBeenCalled();
  });

  test("imports nothing when a statement is rejected", async () => {
    await importFile({ xml: sample.replace(">131995222.27<", ">131995222.28<") });

    const rows = await db
      .select()
      .from(movements)
      .where(eq(movements.bankRelationId, bankRelationId));
    expect(rows).toHaveLength(0);
  });
});
