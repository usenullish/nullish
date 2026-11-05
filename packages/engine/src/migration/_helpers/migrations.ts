import type { Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type SelectMigrations = Records["Migration"]["Migrations"]["Select"];

export const getMigration = async ({
  tx,
  id,
}: { tx: Tx } & Pick<SelectMigrations, "id">): Promise<SelectMigrations> => {
  const migrations = await selectMany({
    tx,
    table: DbSchema.Migration.Migrations.MigrationsSchema,
    schema: RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema,
    where: eq(DbSchema.Migration.Migrations.MigrationsSchema.id, id),
  });

  assertArrayExactlyOne(migrations);

  const [migration] = migrations;
  return migration;
};
