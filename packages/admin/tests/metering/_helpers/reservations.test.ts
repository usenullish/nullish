import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  deleteExpiredReservations,
  deleteReservation,
  getReservedTokens,
  insertReservation,
} from "../../../src/metering/_helpers/reservations";
import {
  openTestDb,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const instance = await openTestDb();
const db = instance.connection;

const reservations = DbSchema.Metering.LlmReservations.LlmReservationsSchema;

const reservationsOf = (userId: string) =>
  db.select().from(reservations).where(eq(reservations.userId, userId));

const insertExpired = ({ userId }: { userId: string }) =>
  db.insert(reservations).values({
    userId,
    reservedTokens: 100n,
    expiresAt: new Date(Date.now() - 1000),
  });

const reserve = ({ userId, reservedTokens = 100n }: { userId: string; reservedTokens?: bigint }) =>
  db.transaction((tx) => insertReservation({ tx, userId, reservedTokens, expiresInSeconds: 300 }));

describe("reservations helpers", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("insertReservation", () => {
    test("inserts the reservation with its expiry", async () => {
      const reservation = await reserve({ userId: TEST_USER_ID });

      expect(reservation).toMatchObject({ userId: TEST_USER_ID, reservedTokens: 100n });
      expect(reservation.expiresAt.getTime()).toBeGreaterThan(Date.now() + 290_000);
      expect(reservation.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 300_000);
    });
  });

  describe("deleteReservation", () => {
    test("deletes the reservation of the user", async () => {
      const { id } = await reserve({ userId: TEST_USER_ID });

      await db.transaction((tx) => deleteReservation({ tx, userId: TEST_USER_ID, id }));

      expect(await reservationsOf(TEST_USER_ID)).toHaveLength(0);
    });

    test("does not delete the reservation of another user", async () => {
      const { id } = await reserve({ userId: TEST_USER_ID });

      await db.transaction((tx) => deleteReservation({ tx, userId: TEST_OTHER_USER_ID, id }));

      expect(await reservationsOf(TEST_USER_ID)).toHaveLength(1);
    });
  });

  describe("deleteExpiredReservations", () => {
    test("deletes the expired reservations and keeps the open ones", async () => {
      await insertExpired({ userId: TEST_USER_ID });
      const { id } = await reserve({ userId: TEST_USER_ID });

      await db.transaction((tx) => deleteExpiredReservations({ tx, userId: TEST_USER_ID }));

      const remaining = await reservationsOf(TEST_USER_ID);

      expect(remaining.map((reservation) => reservation.id)).toEqual([id]);
    });

    test("does not delete the expired reservations of another user", async () => {
      await insertExpired({ userId: TEST_OTHER_USER_ID });

      await db.transaction((tx) => deleteExpiredReservations({ tx, userId: TEST_USER_ID }));

      expect(await reservationsOf(TEST_OTHER_USER_ID)).toHaveLength(1);
    });
  });

  describe("getReservedTokens", () => {
    test("returns zero without reservation", async () => {
      const tokens = await db.transaction((tx) => getReservedTokens({ tx, userId: TEST_USER_ID }));

      expect(tokens).toBe(0n);
    });

    test("returns the tokens of the reservations of the user", async () => {
      await reserve({ userId: TEST_USER_ID, reservedTokens: 100n });
      await reserve({ userId: TEST_USER_ID, reservedTokens: 50n });
      await reserve({ userId: TEST_OTHER_USER_ID, reservedTokens: 1000n });

      const tokens = await db.transaction((tx) => getReservedTokens({ tx, userId: TEST_USER_ID }));

      expect(tokens).toBe(150n);
    });
  });
});
