import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as z from "zod";
import { sql } from "drizzle-orm";
import { numeric, pgTable, pgView, text, uuid } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, type Result } from "@usenullish/nullish-common";
import {
  DbLedgerReports,
  type DbLedgerReportsArgs,
} from "../../../src/ledger/reports/_ledger-reports";
import { envDbUrl } from "@usenullish/nullish-env";

const balances = pgTable("test_engine_ledger_reports_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  periodId: uuid("period_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  totalDebit: numeric("total_debit").notNull().default("0"),
  totalCredit: numeric("total_credit").notNull().default("0"),
  balance: numeric("balance").notNull().default("0"),
});

const balancesView = pgView("test_engine_ledger_reports_balances_view", {
  id: uuid("id"),
  organizationId: uuid("organization_id"),
  periodId: uuid("period_id"),
  code: text("code"),
  name: text("name"),
  totalDebit: numeric("total_debit"),
  totalCredit: numeric("total_credit"),
  balance: numeric("balance"),
}).existing();

const BalanceRowSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  periodId: z.string(),
  code: z.string(),
  name: z.string(),
  totalDebit: z.bigint(),
  totalCredit: z.bigint(),
  balance: z.bigint(),
});

const CodeOnlySchema = z.object({ code: z.number() });

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-4000-8000-000000000002";
const PERIOD_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_PERIOD_ID = "00000000-0000-4000-8000-000000000020";
const USER_ID = "user-00000000-0000-4000-8000-000000000000" as DbLedgerReportsArgs["userId"];

class TestLedgerReports extends DbLedgerReports<typeof balancesView> {
  constructor(args: DbLedgerReportsArgs) {
    super({ ...args, view: balancesView });
  }

  list<T>({
    schema,
    periodId = PERIOD_ID,
  }: {
    schema: z.ZodType<T>;
    periodId?: string;
  }): Promise<Result<T[]>> {
    return this._list({ schema, periodId });
  }
}

const reportsFor = (organizationId: string): TestLedgerReports =>
  new TestLedgerReports({
    db: db as unknown as DbLedgerReportsArgs["db"],
    userId: USER_ID,
    organizationId,
  });

const UNREACHABLE_URL = "postgresql://nope:nope@127.0.0.1:1/nope";
const unreachableReports = (organizationId: string): TestLedgerReports =>
  new TestLedgerReports({
    db: drizzle({ client: new BunSQL(UNREACHABLE_URL) }) as unknown as DbLedgerReportsArgs["db"],
    userId: USER_ID,
    organizationId,
  });

const seed = (
  rows: {
    organizationId: string;
    periodId?: string;
    code: string;
    name?: string;
    totalDebit?: string;
    totalCredit?: string;
    balance?: string;
  }[],
): Promise<unknown> =>
  db.insert(balances).values(rows.map((row) => ({ name: "Account", periodId: PERIOD_ID, ...row })));

describe("_ledger-reports", () => {
  beforeAll(async () => {
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_engine_ledger_reports_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      period_id UUID NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      total_debit NUMERIC NOT NULL DEFAULT 0,
      total_credit NUMERIC NOT NULL DEFAULT 0,
      balance NUMERIC NOT NULL DEFAULT 0
      );
  `);

    await db.execute(sql`DROP VIEW IF EXISTS test_engine_ledger_reports_balances_view;`);
    await db.execute(sql`
    CREATE VIEW test_engine_ledger_reports_balances_view AS
      SELECT id, organization_id, period_id, code, name, total_debit, total_credit, balance
      FROM test_engine_ledger_reports_balances;
  `);

    await db.execute(sql`GRANT USAGE ON SCHEMA public TO authenticated_user;`);
    await db.execute(
      sql`GRANT SELECT ON test_engine_ledger_reports_balances_view TO authenticated_user;`,
    );
  });

  afterAll(async () => {
    await db.execute(sql`DROP VIEW IF EXISTS test_engine_ledger_reports_balances_view;`);
    await db.execute(sql`DROP TABLE IF EXISTS test_engine_ledger_reports_balances;`);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE test_engine_ledger_reports_balances CASCADE;`);
  });

  describe("DbLedgerReports._list", () => {
    test("returns only the rows for the configured organization id", async () => {
      await seed([
        { organizationId: ORG_ID, code: "1000" },
        { organizationId: ORG_ID, code: "2000" },
        { organizationId: OTHER_ORG_ID, code: "9000" },
      ]);

      const result = await reportsFor(ORG_ID).list({ schema: BalanceRowSchema });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map((row) => row.code).sort()).toEqual(["1000", "2000"]);
    });

    test("returns only the rows for the given period id", async () => {
      await seed([
        { organizationId: ORG_ID, code: "1000" },
        { organizationId: ORG_ID, periodId: OTHER_PERIOD_ID, code: "2000" },
      ]);

      const result = await reportsFor(ORG_ID).list({
        schema: BalanceRowSchema,
        periodId: OTHER_PERIOD_ID,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map((row) => row.code)).toEqual(["2000"]);
    });

    test("returns a success Result with an empty array when the organization has no rows", async () => {
      await seed([{ organizationId: OTHER_ORG_ID, code: "9000" }]);

      const result = await reportsFor(ORG_ID).list({ schema: BalanceRowSchema });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("casts totalDebit, totalCredit and balance to bigint", async () => {
      await seed([
        {
          organizationId: ORG_ID,
          code: "1000",
          totalDebit: "12345678901234",
          totalCredit: "1",
          balance: "12345678901233",
        },
      ]);

      const result = await reportsFor(ORG_ID).list({ schema: BalanceRowSchema });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const [row] = result.result;
      assertNonNullish(row);
      expect(row.totalDebit).toBe(12345678901234n);
      expect(row.totalCredit).toBe(1n);
      expect(row.balance).toBe(12345678901233n);
    });

    test("passes through the view's other columns unchanged", async () => {
      await seed([{ organizationId: ORG_ID, code: "1000", name: "Bank" }]);

      const result = await reportsFor(ORG_ID).list({ schema: BalanceRowSchema });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result[0]?.name).toBe("Bank");
    });

    test("returns an error Result (not a throw) when a row fails schema validation", async () => {
      await seed([{ organizationId: ORG_ID, code: "1000" }]);

      const result = await reportsFor(ORG_ID).list({ schema: CodeOnlySchema });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const result = await unreachableReports(ORG_ID).list({ schema: BalanceRowSchema });

      expect(result.status).toBe("error");
    });
  });
});
