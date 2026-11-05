import { migrate as drizzleMigrate } from "drizzle-orm/bun-sql/migrator";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { envDbMigrationsFolder } from "@usenullish/nullish-env";

export const migrate = async ({ db }: { db: PostgresDbInstance }) => {
  await drizzleMigrate(db, {
    migrationsFolder: envDbMigrationsFolder(),
    migrationsTable: "migrations",
    migrationsSchema: "system",
  });
};
