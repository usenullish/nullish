import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createOrganization,
  createPeriod,
  createVatPeriod,
  resetDb,
  seedUsers,
  vatPeriods,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_vat_period_immutable_once_closed", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
  });

  test("allows modifying an open VAT period", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const [updated] = await db
      .update(vatPeriods)
      .set({ endOn: new Date("2026-05-31") })
      .where(eq(vatPeriods.id, vatPeriodId))
      .returning();

    expect(updated?.endOn).toEqual(new Date("2026-05-31"));
  });

  test("allows closing an open VAT period", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const [updated] = await db
      .update(vatPeriods)
      .set({ status: VatPeriodStatus.CLOSED })
      .where(eq(vatPeriods.id, vatPeriodId))
      .returning();

    expect(updated?.status).toBe(VatPeriodStatus.CLOSED);
  });

  test("rejects modifying a closed VAT period", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
      status: VatPeriodStatus.CLOSED,
    });

    const error = await db
      .update(vatPeriods)
      .set({ endOn: new Date("2026-05-31") })
      .where(eq(vatPeriods.id, vatPeriodId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is closed and cannot be modified or deleted");
  });

  test("rejects reopening a closed VAT period", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
      status: VatPeriodStatus.CLOSED,
    });

    const error = await db
      .update(vatPeriods)
      .set({ status: VatPeriodStatus.OPEN })
      .where(eq(vatPeriods.id, vatPeriodId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is closed and cannot be modified or deleted");
  });

  test("rejects deleting a closed VAT period", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
      status: VatPeriodStatus.CLOSED,
    });

    const error = await db
      .delete(vatPeriods)
      .where(eq(vatPeriods.id, vatPeriodId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is closed and cannot be modified or deleted");
  });

  test("allows deleting an open VAT period", async () => {
    const vatPeriodId = await createVatPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-06-30"),
    });

    const deleted = await db.delete(vatPeriods).where(eq(vatPeriods.id, vatPeriodId)).returning();

    expect(deleted).toHaveLength(1);
  });
});
