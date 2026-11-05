import { drizzle } from "drizzle-orm/bun-sql";

export type PostgresDbInstance = ReturnType<typeof drizzle>;
