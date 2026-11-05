import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { envDbUrl } from "./packages/env/src/";

process.env.NULLISH_DB_HOST ??= "localhost";
process.env.NULLISH_DB_PORT ??= "5433";
process.env.NULLISH_DB_USERNAME ??= "username";
process.env.NULLISH_DB_PASSWORD ??= "password";
process.env.NULLISH_AUTH_URL ??= "http://localhost:5173";
process.env.NULLISH_AUTH_SECRET ??= "nullish-test-secret-nullish-test-secret";
process.env.NULLISH_LLM_URL ??= "http://localhost:11434/v1";
process.env.NULLISH_LLM_MODEL ??= "qwen3.5:4b";
process.env.NULLISH_LLM_API_KEY ??= "ollama";

const client = new SQL(envDbUrl());

try {
  const db = drizzle({ client });

  await migrate(db, {
    migrationsFolder: "./packages/db/migrations",
    migrationsTable: "migrations",
    migrationsSchema: "system",
  });
} finally {
  try {
    await client.close();
  } catch (error: unknown) {
    console.error("Unexpected error while closing the database", error);
  }
}
