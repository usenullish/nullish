import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { listLines } from "../../../src/billing/_helpers/lines";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("listLines", () => {
  let orgId: string;
  let clientId: string;
  let invoiceId: string;
  let emptyInvoiceId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    clientId = await createClient(db, orgId);
    invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    emptyInvoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE billing.lines CASCADE;`);
    await createLine(db, invoiceId, "Line A");
    await createLine(db, invoiceId, "Line B");
  });

  test("returns every line of the invoice", async () => {
    const lines = await db.transaction((tx) => listLines({ tx, invoiceId }));

    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.description)).toEqual(
      expect.arrayContaining(["Line A", "Line B"]),
    );
  });

  test("rejects when the invoice has no lines", async () => {
    await expect(
      db.transaction((tx) => listLines({ tx, invoiceId: emptyInvoiceId })),
    ).rejects.toThrow();
  });
});
