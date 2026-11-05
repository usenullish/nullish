import { and, eq, lte, sql } from "drizzle-orm";
import { assertArrayExactlyOne, assertNonNullish } from "@usenullish/nullish-common";
import { deleteMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const reservations = DbSchema.Metering.LlmReservations.LlmReservationsSchema;

type SelectLlmReservations = Records["Metering"]["LlmReservations"]["Select"];

export const insertReservation = async ({
  tx,
  userId,
  reservedTokens,
  expiresInSeconds,
}: Pick<SelectLlmReservations, "userId" | "reservedTokens"> & {
  tx: Tx;
  expiresInSeconds: number;
}): Promise<SelectLlmReservations> => {
  const rows = await tx
    .insert(reservations)
    .values({
      userId,
      reservedTokens,
      expiresAt: sql`now() + make_interval(secs => ${expiresInSeconds})`,
    })
    .returning();

  assertArrayExactlyOne(rows);

  const [row] = rows;
  return RecordsSchema.Metering.LlmReservationsSchema.SelectLlmReservationsSchema.parse(row);
};

export const deleteReservation = async ({
  tx,
  userId,
  id,
}: Pick<SelectLlmReservations, "userId" | "id"> & { tx: Tx }): Promise<void> => {
  const where = and(eq(reservations.id, id), eq(reservations.userId, userId));

  assertNonNullish(where);

  await deleteMany({
    tx,
    table: reservations,
    returningSchema: RecordsSchema.Metering.LlmReservationsSchema.SelectLlmReservationsSchema,
    where,
  });
};

export const deleteExpiredReservations = async ({
  tx,
  userId,
}: Pick<SelectLlmReservations, "userId"> & { tx: Tx }): Promise<void> => {
  const where = and(eq(reservations.userId, userId), lte(reservations.expiresAt, sql`now()`));

  assertNonNullish(where);

  await deleteMany({
    tx,
    table: reservations,
    returningSchema: RecordsSchema.Metering.LlmReservationsSchema.SelectLlmReservationsSchema,
    where,
  });
};

export const getReservedTokens = async ({
  tx,
  userId,
}: Pick<SelectLlmReservations, "userId"> & { tx: Tx }): Promise<bigint> => {
  const rows = await tx
    .select({
      tokens: sql<bigint>`COALESCE(SUM(${reservations.reservedTokens}), 0)`.mapWith(BigInt),
    })
    .from(reservations)
    .where(eq(reservations.userId, userId));

  assertArrayExactlyOne(rows);

  const [{ tokens }] = rows;
  return tokens;
};
