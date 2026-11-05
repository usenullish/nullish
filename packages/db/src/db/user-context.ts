import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { sql } from "drizzle-orm";
import type { PgMaterializedView } from "drizzle-orm/pg-core/view";
import { tryCatch } from "@usenullish/nullish-common";
import { getMaterializedViewConfig } from "drizzle-orm/pg-core";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Tx } from "../types";

type UserId = Records["Auth"]["Users"]["Select"]["id"];

export interface DbUserContextArgs {
  db: PostgresDbInstance;
  userId: UserId;
}

export abstract class DbUserContext {
  readonly #db: PostgresDbInstance;
  readonly #userId: UserId;

  protected constructor({ db, userId }: DbUserContextArgs) {
    this.#db = db;
    this.#userId = userId;
  }

  protected async _withAuth<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return await this.#db.transaction<T>(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
      await tx.execute(sql`SELECT auth.set_current_user_id(${this.#userId})`);
      return await fn(tx);
    });
  }

  protected async _withRefresh<T>({
    fn,
    view,
  }: {
    fn: () => Promise<T>;
    view: PgMaterializedView;
  }): Promise<T> {
    const refresh = async () => {
      return await tryCatch(async () => {
        await this.#db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view};`);
      });
    };

    const triggerRefresh = async () => {
      const result = await refresh();

      if (result.status === "error") {
        const viewName = getMaterializedViewConfig(view).name;

        // TODO: better logging?
        console.error(`Failed background refresh for view "${viewName}":`, result.err);
      }
    };

    const result = await fn();

    // Only refreshes on success
    void triggerRefresh();

    return result;
  }
}
