import { drizzle } from "drizzle-orm/bun-sql";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { SQL } from "bun";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { authRelations, type PostgresDbInstance } from "@usenullish/nullish-schema/db";

export class DbInstance {
  readonly #instance: PostgresDbInstance;

  private constructor({ instance }: { instance: PostgresDbInstance }) {
    this.#instance = instance;
  }

  static open({ url }: { url: Common["PostgresUrl"] }): DbInstance {
    const db = drizzle({
      client: new SQL(url, { bigint: true }),
      relations: {
        ...authRelations,
      },
    });
    return new this({ instance: db });
  }

  get connection(): PostgresDbInstance {
    return this.#instance;
  }

  close(): Promise<Result<void>> {
    return tryCatch(async () => {
      await this.#instance.$client.close();
    });
  }
}
