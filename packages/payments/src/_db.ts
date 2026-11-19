import { DbAdminContext } from "@usenullish/nullish-db";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";

export const withDbContext = async <T>(fn: (db: PostgresDbInstance) => Promise<T>): Promise<T> => {
  const context = await DbAdminContext.open();

  try {
    return await fn(context.connection);
  } finally {
    await context.close();
  }
};
