import type { SelectManyFilterArgs, Tx } from "@usenullish/nullish-db";
import { selectMany, updateMany } from "@usenullish/nullish-db";
import { BankMovementStatus, type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { and, count, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import type { LockStrength } from "drizzle-orm/pg-core";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import {
  assertArrayExactlyOne,
  isNullish,
  nonNullish,
  type Option,
} from "@usenullish/nullish-common";

type SelectMovements = Records["Banking"]["Movements"]["Select"];
type InsertMovements = Records["Banking"]["Movements"]["Insert"];
type FilterMovements = Records["Banking"]["Movements"]["Filter"];
type UpdateMovements = Records["Banking"]["Movements"]["Update"];

export const buildMovementsWhere = ({
  status,
  bookedOnFrom,
  bookedOnTo,
}: FilterMovements): Option<SQL> => {
  const movements = DbSchema.Banking.Movements.MovementsSchema;

  return and(
    nonNullish(status) ? eq(movements.status, status) : undefined,
    nonNullish(bookedOnFrom) ? gte(movements.bookedOn, bookedOnFrom) : undefined,
    nonNullish(bookedOnTo) ? lte(movements.bookedOn, bookedOnTo) : undefined,
  );
};

export const listMovements = async ({
  tx,
  bankRelationId,
  filters,
  ...queryArgs
}: {
  tx: Tx;
  bankRelationId: SelectMovements["bankRelationId"];
  filters: Option<FilterMovements>;
} & Required<SelectManyFilterArgs>): Promise<SelectMovements[]> =>
  await selectMany({
    tx,
    table: DbSchema.Banking.Movements.MovementsSchema,
    schema: RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema,
    where: and(
      eq(DbSchema.Banking.Movements.MovementsSchema.bankRelationId, bankRelationId),
      isNullish(filters) ? undefined : buildMovementsWhere(filters),
    ),
    ...queryArgs,
  });

export const insertNotConflictingNewMovements = async ({
  tx,
  values,
}: {
  tx: Tx;
  values: [InsertMovements, ...InsertMovements[]];
}): Promise<SelectMovements[]> => {
  const movements = DbSchema.Banking.Movements.MovementsSchema;

  const rows = await tx
    .insert(movements)
    .values(values)
    .onConflictDoNothing({ target: [movements.bankRelationId, movements.dedupeHash] })
    .returning();

  return rows.map((row) => RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema.parse(row));
};

export const countUnreconciledMovements = async ({
  tx,
  bankRelationIds,
}: {
  tx: Tx;
  bankRelationIds: [SelectMovements["bankRelationId"], ...SelectMovements["bankRelationId"][]];
}): Promise<Map<SelectMovements["bankRelationId"], number>> => {
  const movements = DbSchema.Banking.Movements.MovementsSchema;

  const rows = await tx
    .select({ bankRelationId: movements.bankRelationId, unreconciled: count() })
    .from(movements)
    .where(
      and(
        inArray(movements.bankRelationId, bankRelationIds),
        eq(movements.status, BankMovementStatus.UNRECONCILED),
      ),
    )
    .groupBy(movements.bankRelationId);

  return new Map(rows.map(({ bankRelationId, unreconciled }) => [bankRelationId, unreconciled]));
};

export const getMovement = async ({
  tx,
  id,
  lock,
}: { tx: Tx; lock?: LockStrength } & Pick<SelectMovements, "id">): Promise<SelectMovements> => {
  const movements = await selectMany({
    tx,
    table: DbSchema.Banking.Movements.MovementsSchema,
    schema: RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema,
    where: eq(DbSchema.Banking.Movements.MovementsSchema.id, id),
    lock,
  });

  assertArrayExactlyOne(movements);

  const [movement] = movements;
  return movement;
};

export const updateMovement = async ({
  tx,
  movementId,
  values,
}: {
  tx: Tx;
  movementId: SelectMovements["id"];
  values: Partial<UpdateMovements>;
}): Promise<SelectMovements> => {
  const updatedMovements = await updateMany<SelectMovements, Db["Banking"]["Movements"]>({
    tx,
    table: DbSchema.Banking.Movements.MovementsSchema,
    values,
    returningSchema: RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema,
    where: eq(DbSchema.Banking.Movements.MovementsSchema.id, movementId),
  });

  assertArrayExactlyOne(updatedMovements);

  const [updatedMovement] = updatedMovements;
  return updatedMovement;
};
