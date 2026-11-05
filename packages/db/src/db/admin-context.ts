import { sql, type SQL } from "drizzle-orm";
import type { DbInstance } from "./instance";
import { openDb } from "../open";
import type { Tx } from "../types";
import type { Records } from "@usenullish/nullish-schema/records";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";

type UserId = Records["Auth"]["Users"]["Select"]["id"];

export class DbAdminContext {
  readonly #db: DbInstance;

  private constructor({ db }: { db: DbInstance }) {
    this.#db = db;
  }

  static async open(): Promise<DbAdminContext> {
    const dbResult = await openDb();

    if (dbResult.status === "error") {
      throw dbResult.err;
    }

    return new this({ db: dbResult.result });
  }

  get connection(): PostgresDbInstance {
    return this.#db.connection;
  }

  async exec<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return await this.#db.connection.transaction<T>(async (tx) => {
      return await fn(tx);
    });
  }

  async execWithUser<T>({
    fn,
    userId,
  }: {
    fn: (tx: Tx) => Promise<T>;
    userId: UserId;
  }): Promise<T> {
    return await this.#db.connection.transaction<T>(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
      await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);

      return await fn(tx);
    });
  }

  async execSystem({ sql }: { sql: SQL }): Promise<void> {
    await this.#db.connection.execute(sql);
  }

  async close(): Promise<void> {
    await this.#db.close();
  }
}
