import { DbAdminContext } from "@usenullish/nullish-db";

export const withDbContext = async <T>(fn: (db: DbAdminContext) => Promise<T>): Promise<T> => {
  const context = await DbAdminContext.open();

  try {
    return await fn(context);
  } finally {
    await context.close();
  }
};
