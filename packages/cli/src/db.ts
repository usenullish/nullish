import { exit } from "./utils/exit";
import { tryCatch } from "@usenullish/nullish-common";
import { DbAdminContext } from "@usenullish/nullish-db";

export const withDbContext = async <T>(fn: (db: DbAdminContext) => Promise<T>): Promise<T> => {
  const contextResult = await tryCatch(async () => {
    return await DbAdminContext.open();
  });

  if (contextResult.status === "error") {
    exit({
      msg: "Cannot open the database.",
      err: contextResult.err,
    });
  }

  const { result: context } = contextResult;

  try {
    return await fn(context);
  } finally {
    await context.close();
  }
};
