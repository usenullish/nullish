import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { deleteAuditLogs } from "../../../src/organizations/_helpers/audit-logs";
import { openTestDb } from "../../_test-utils";

const instance = await openTestDb();
const db = instance.connection;

const logs = DbSchema.Audit.Logs.LogsSchema;

const insertLog = async ({ organizationId }: { organizationId: string }): Promise<string> => {
  const recordId = crypto.randomUUID();

  await db.insert(logs).values({
    tableSchema: "test",
    tableName: "test",
    recordId,
    organizationId,
    operation: "insert",
  });

  return recordId;
};

const countLogs = (recordId: string): Promise<number> =>
  db.$count(logs, eq(logs.recordId, recordId));

const deleteLogs = (organizationId: string) =>
  db.transaction((tx) => deleteAuditLogs({ tx, organizationId }));

describe("deleteAuditLogs", () => {
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE audit.logs`);
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE audit.logs`);
    await instance.close();
  });

  test("deletes the logs of the organization", async () => {
    const organizationId = crypto.randomUUID();
    const firstRecordId = await insertLog({ organizationId });
    const secondRecordId = await insertLog({ organizationId });

    await deleteLogs(organizationId);

    expect(await countLogs(firstRecordId)).toBe(0);
    expect(await countLogs(secondRecordId)).toBe(0);
  });

  test("keeps the logs of another organization", async () => {
    const organizationId = crypto.randomUUID();
    await insertLog({ organizationId });
    const otherRecordId = await insertLog({ organizationId: crypto.randomUUID() });

    await deleteLogs(organizationId);

    expect(await countLogs(otherRecordId)).toBe(1);
  });
});
