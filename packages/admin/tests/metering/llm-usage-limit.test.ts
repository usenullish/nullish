import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  LlmReservationType,
  LlmUsageLimitService,
} from "../../src/metering/services/llm-usage-limit";
import {
  openTestDb,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  withAuthenticatedUser,
} from "../_test-utils";

const llmUsages = DbSchema.Metering.LlmUsages.LlmUsagesSchema;
const llmReservations = DbSchema.Metering.LlmReservations.LlmReservationsSchema;

const MODEL = "test-model";

const instance = await openTestDb();
const db = instance.connection;

const reserve = ({ userId = TEST_USER_ID, limit }: { userId?: string; limit: bigint }) =>
  LlmUsageLimitService.create({ db }).reserve({
    userId,
    model: MODEL,
    from: new Date(0),
    limit,
    reservedTokens: 100n,
    expiresInSeconds: 300,
  });

const reservationsOf = (userId: string) =>
  db.select().from(llmReservations).where(eq(llmReservations.userId, userId));

describe("LlmUsageLimitService", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("reserve", () => {
    test("reserves the tokens for the user", async () => {
      const result = await reserve({ limit: 1000n });

      if (result.status === "error" || result.result.type !== LlmReservationType.RESERVED) {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.reservation).toMatchObject({
        userId: TEST_USER_ID,
        reservedTokens: 100n,
      });
      expect(result.result.reservation.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test("returns an error once the recorded usage reaches the limit", async () => {
      await db.insert(llmUsages).values({
        userId: TEST_USER_ID,
        model: MODEL,
        inputTokens: 60n,
        outputTokens: 40n,
      });

      const result = await reserve({ limit: 100n });

      expect(result).toEqual({
        status: "success",
        result: { type: LlmReservationType.LIMIT_REACHED },
      });
    });

    test("counts the open reservations against the limit", async () => {
      const first = await reserve({ limit: 100n });
      const second = await reserve({ limit: 100n });

      expect(first.status === "success" && first.result.type).toBe(LlmReservationType.RESERVED);
      expect(second).toEqual({
        status: "success",
        result: { type: LlmReservationType.LIMIT_REACHED },
      });
    });

    test("lets only one of parallel reservations through when one reaches the limit", async () => {
      const results = await Promise.all([
        reserve({ limit: 100n }),
        reserve({ limit: 100n }),
        reserve({ limit: 100n }),
      ]);

      expect(
        results.filter(
          (result) =>
            result.status === "success" && result.result.type === LlmReservationType.RESERVED,
        ),
      ).toHaveLength(1);
      expect(await reservationsOf(TEST_USER_ID)).toHaveLength(1);
    });

    test("does not count the usage of other models", async () => {
      await db.insert(llmUsages).values({
        userId: TEST_USER_ID,
        model: "other-model",
        inputTokens: 500n,
        outputTokens: 500n,
      });

      const result = await reserve({ limit: 100n });

      expect(result.status).toBe("success");
    });

    test("does not count the usage and reservations of other users", async () => {
      await db.insert(llmUsages).values({
        userId: TEST_OTHER_USER_ID,
        model: MODEL,
        inputTokens: 500n,
        outputTokens: 500n,
      });
      await reserve({ userId: TEST_OTHER_USER_ID, limit: 10000n });

      const result = await reserve({ limit: 100n });

      expect(result.status).toBe("success");
    });

    test("ignores and deletes the expired reservations", async () => {
      await db.insert(llmReservations).values({
        userId: TEST_USER_ID,
        reservedTokens: 100n,
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await reserve({ limit: 100n });

      expect(result.status).toBe("success");

      const reservations = await reservationsOf(TEST_USER_ID);

      expect(reservations).toHaveLength(1);
      expect(reservations[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("release", () => {
    test("deletes the reservation", async () => {
      const reserved = await reserve({ limit: 1000n });

      if (reserved.status === "error" || reserved.result.type !== LlmReservationType.RESERVED) {
        expect(true).toBeFalse();
        return;
      }

      const result = await LlmUsageLimitService.create({ db }).release({
        userId: TEST_USER_ID,
        id: reserved.result.reservation.id,
      });

      expect(result.status).toBe("success");
      expect(await reservationsOf(TEST_USER_ID)).toHaveLength(0);
    });

    test("does not delete the reservation of another user", async () => {
      const reserved = await reserve({ limit: 1000n });

      if (reserved.status === "error" || reserved.result.type !== LlmReservationType.RESERVED) {
        expect(true).toBeFalse();
        return;
      }

      await LlmUsageLimitService.create({ db }).release({
        userId: TEST_OTHER_USER_ID,
        id: reserved.result.reservation.id,
      });

      expect(await reservationsOf(TEST_USER_ID)).toHaveLength(1);
    });
  });

  describe("permissions", () => {
    test("the user cannot insert a reservation", async () => {
      const inserted = withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        tx.insert(llmReservations).values({
          userId: TEST_USER_ID,
          reservedTokens: 1n,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      );

      await expect(inserted).rejects.toThrow();
    });

    test("the user cannot delete a reservation", async () => {
      await reserve({ limit: 1000n });

      await expect(
        withAuthenticatedUser(db, TEST_USER_ID, (tx) => tx.delete(llmReservations)),
      ).rejects.toThrow();

      expect(await reservationsOf(TEST_USER_ID)).toHaveLength(1);
    });
  });
});
