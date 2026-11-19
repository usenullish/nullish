import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";

export interface AdminServiceContextArgs {
  db: PostgresDbInstance;
}

export abstract class AdminServiceContext {
  readonly #db: PostgresDbInstance;

  protected constructor({ db }: AdminServiceContextArgs) {
    this.#db = db;
  }

  protected _withDbContext<T>(fn: (tx: Tx) => Promise<T>): Promise<Result<T>> {
    return tryCatch(async () => {
      return await this.#db.transaction(fn);
    });
  }
}
