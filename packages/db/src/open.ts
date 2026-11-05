import { type Result, tryCatch } from "@usenullish/nullish-common";
import { DbInstance } from "./db/instance";
import { envDbUrl } from "@usenullish/nullish-env";
import { migrate } from "./_setup";

export const openDb = async (): Promise<Result<DbInstance>> => {
  return await tryCatch(async () => {
    const instance = createInstance();

    await migrate({
      db: instance.connection,
    });

    return instance;
  });
};

const createInstance = (): DbInstance => {
  return DbInstance.open({
    url: envDbUrl(),
  });
};
