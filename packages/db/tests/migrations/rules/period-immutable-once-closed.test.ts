import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  createPeriod,
  periods,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("check_period_immutable_once_closed", () => {
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
  });

  test("allows modifying an open period", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
    });

    const [updated] = await db
      .update(periods)
      .set({ endOn: new Date("2026-02-28") })
      .where(eq(periods.id, periodId))
      .returning();

    expect(updated?.endOn).toEqual(new Date("2026-02-28"));
  });

  test("allows closing an open period", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
    });

    const [updated] = await db
      .update(periods)
      .set({ status: PeriodStatus.CLOSED })
      .where(eq(periods.id, periodId))
      .returning();

    expect(updated?.status).toBe(PeriodStatus.CLOSED);
  });

  test("rejects modifying a closed period", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
      status: PeriodStatus.CLOSED,
    });

    const error = await db
      .update(periods)
      .set({ endOn: new Date("2026-02-28") })
      .where(eq(periods.id, periodId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is closed and cannot be modified or deleted");
  });

  test("rejects deleting a closed period", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
      status: PeriodStatus.CLOSED,
    });

    const error = await db
      .delete(periods)
      .where(eq(periods.id, periodId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is closed and cannot be modified or deleted");
  });

  test("allows deleting an open period", async () => {
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
    });

    const deleted = await db.delete(periods).where(eq(periods.id, periodId)).returning();

    expect(deleted).toHaveLength(1);
  });
});
