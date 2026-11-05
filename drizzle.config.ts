import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./packages/schema/src/db/schemas",
    "./packages/schema/src/db/materialized-views",
    "./packages/schema/src/db/views",
  ],
  out: "./packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://username:password@localhost:5432/nullish",
  },
  migrations: {
    table: "migrations",
    schema: "system",
  },
  entities: {
    roles: true,
  },
});
