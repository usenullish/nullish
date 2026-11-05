import { selectMany, type Tx, updateMany } from "@usenullish/nullish-db";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import type { LockStrength } from "drizzle-orm/pg-core";

type SelectMigrations = Records["Migration"]["Migrations"]["Select"];

export const getMigration = async ({
  tx,
  id,
  lock,
}: { tx: Tx; lock?: LockStrength } & Pick<SelectMigrations, "id">): Promise<SelectMigrations> => {
  const migrations = await selectMany({
    tx,
    table: DbSchema.Migration.Migrations.MigrationsSchema,
    schema: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
    where: eq(DbSchema.Migration.Migrations.MigrationsSchema.id, id),
    lock,
  });

  assertArrayExactlyOne(migrations);

  const [migration] = migrations;
  return migration;
};

export const updateMigrationStatus = async ({
  tx,
  id,
  status,
}: { tx: Tx } & Pick<SelectMigrations, "id" | "status">): Promise<SelectMigrations> => {
  const migrations = await updateMany<SelectMigrations, Db["Migration"]["Migrations"]>({
    tx,
    table: DbSchema.Migration.Migrations.MigrationsSchema,
    values: { status },
    returningSchema: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
    where: eq(DbSchema.Migration.Migrations.MigrationsSchema.id, id),
  });

  assertArrayExactlyOne(migrations);

  const [migration] = migrations;
  return migration;
};
